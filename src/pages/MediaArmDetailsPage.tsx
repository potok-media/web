import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaDetailsErrorView } from "../components/mediaDetails/MediaDetailsErrorView";
import { reconstructLayout } from "../features/arm/layoutReconstruction";
import { resolveCanonicalTarget, type ArmCanonicalTarget } from "../features/arm/armGroupSelection";
import { summarizeArmGroups, type ArmGroupSummary } from "../features/arm/armGroupDisplay";
import { getArmEntriesCached, getArmEpisodesCached } from "../features/arm/armLayoutCache";
import { ApiClient } from "../network/ApiClient";
import MediaDetailsPage from "./MediaDetailsPage";

type CanonicalState =
  | { status: "loading" }
  | { status: "ready"; target: ArmCanonicalTarget; groupSummary: ArmGroupSummary }
  | { status: "missing" };

/**
 * Canonical media page: /media/p/:potokId (?g=<entryId>). The ARM graph owns identity and
 * structure — the layout yields the selected group's TMDB coordinate, and the regular details
 * page renders from it (display metadata stays TMDB-sourced on the user's locale). A work
 * without a bridged group has no TMDB-addressable content yet: the error view stands in.
 */
export const MediaArmDetailsPage: React.FC = () => {
  const { potokId } = useParams<{ potokId: string }>();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get("g");
  const { t, i18n } = useTranslation("media");
  const [state, setState] = useState<CanonicalState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!potokId) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    void (async () => {
      try {
        const [entriesRes, episodesRes] = await Promise.all([
          getArmEntriesCached(potokId, undefined, i18n.language, (ifNoneMatch) =>
            ApiClient.getArmEntries(potokId, { locale: i18n.language, signal: controller.signal, ifNoneMatch }), reloadKey > 0),
          getArmEpisodesCached(potokId, undefined, i18n.language, (ifNoneMatch) =>
            ApiClient.getArmEpisodes(potokId, { locale: i18n.language, signal: controller.signal, ifNoneMatch }), reloadKey > 0),
        ]);
        if (controller.signal.aborted) return;
        const layout = reconstructLayout(entriesRes.entries, episodesRes.episodes, potokId);
        const target = resolveCanonicalTarget(layout, entryId);
        const groupSummary = summarizeArmGroups(layout.groups);
        setState(target ? { status: "ready", target, groupSummary } : { status: "missing" });
      } catch {
        if (!controller.signal.aborted) setState({ status: "missing" });
      }
    })();
    return () => controller.abort();
  }, [potokId, entryId, i18n.language, reloadKey]);

  if (state.status === "loading") return <LoadingSpinner />;
  if (state.status === "missing") {
    return (
      <MediaDetailsErrorView
        error={t("details.loadFailed")}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }
  return (
    <MediaDetailsPage
      key={`${potokId}:${state.target.entryId}`}
      resolvedMediaType={state.target.mediaType}
      resolvedMediaId={state.target.tmdbId}
      resolvedGroupSummary={state.target.mediaType === "tv" ? state.groupSummary : undefined}
      initialGroupId={state.target.entryId}
    />
  );
};

export default MediaArmDetailsPage;

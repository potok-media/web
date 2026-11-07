import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaDetailsErrorView } from "../components/mediaDetails/MediaDetailsErrorView";
import { reconstructLayout } from "../features/arm/layoutReconstruction";
import { resolveCanonicalTarget, type ArmCanonicalTarget } from "../features/arm/armGroupSelection";
import { summarizeArmGroups, type ArmGroupSummary } from "../features/arm/armGroupDisplay";
import { selectArmAnimeEntry } from "../features/mediaDetails/armAnimeMedia";
import { getArmEntriesCached, getArmEpisodesCached } from "../features/arm/armLayoutCache";
import { ApiClient } from "../network/ApiClient";
import type { ArmEntryDetail, ArmEpisodeDetail } from "../network/ArmTypes";
import MediaDetailsPage from "./MediaDetailsPage";

type CanonicalState =
  | { status: "loading" }
  | {
      status: "ready";
      /** TMDB coordinate of the selected group; null when the work has no tmdb bridge yet. */
      target: ArmCanonicalTarget | null;
      groupSummary: ArmGroupSummary;
      entries: ArmEntryDetail[];
      episodes: ArmEpisodeDetail[];
    }
  | { status: "missing" };

/**
 * Canonical media page: /media/p/:potokId (?g=<entryId>). The ARM graph owns identity and
 * structure — the layout yields the selected group's TMDB coordinate, and the regular details
 * page renders from it (display metadata stays TMDB-sourced on the user's locale).
 *
 * Works WITHOUT a tmdb bridge used to be a dead error view even though the anime exists in
 * AniList/Shikimori/MAL: when the selected entry carries anime display metadata, the same
 * details page renders from the ARM identity instead (banner, AniList/Shikimori description,
 * genres, score — synthesized into the regular media card).
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
        const layout = reconstructLayout(entriesRes.entries, episodesRes.episodes, potokId, i18n.language);
        const target = resolveCanonicalTarget(layout, entryId);
        const groupSummary = summarizeArmGroups(layout.groups);
        setState({ status: "ready", target, groupSummary, entries: entriesRes.entries, episodes: episodesRes.episodes });
      } catch {
        if (!controller.signal.aborted) setState({ status: "missing" });
      }
    })();
    return () => controller.abort();
  }, [potokId, entryId, i18n.language, reloadKey]);

  const armAnime = useMemo(
    () =>
      state.status === "ready" && !state.target
        ? {
            workId: potokId as string,
            entries: state.entries,
            episodes: state.episodes,
            initialGroupId: entryId,
          }
        : undefined,
    [state, potokId, entryId],
  );

  if (state.status === "loading") return <LoadingSpinner />;

  const errorView = (
    <MediaDetailsErrorView
      error={t("details.loadFailed")}
      onRetry={() => setReloadKey((key) => key + 1)}
    />
  );

  if (state.status === "missing") return errorView;
  if (!state.target) {
    const animeEntry = selectArmAnimeEntry(state.entries, entryId);
    if (!animeEntry?.displayMetadata || !armAnime) return errorView;
    return (
      <MediaDetailsPage
        key={`${potokId}:${animeEntry.entryId}`}
        initialGroupId={animeEntry.entryId}
        armSummary={{ workId: potokId ?? null, graphVersion: null }}
        armAnime={armAnime}
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
      armSummary={{ workId: potokId ?? null, graphVersion: null }}
    />
  );
};

export default MediaArmDetailsPage;

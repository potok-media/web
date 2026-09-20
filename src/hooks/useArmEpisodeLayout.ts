import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { canReadArmLayout, type ArmCoverageState, type ArmMediaSummary } from "../network/ArmTypes";
import { toEpisodeGroupPresentations, type EpisodeGroupPresentation } from "../features/arm/episodeLayoutModel";

type ArmEpisodeLayoutState =
  | { status: "loading"; groups: EpisodeGroupPresentation[]; coverageState: ArmCoverageState }
  | { status: "arm"; groups: EpisodeGroupPresentation[]; coverageState: ArmCoverageState }
  | { status: "providerFallback"; groups: EpisodeGroupPresentation[]; coverageState: ArmCoverageState };

interface UseArmEpisodeLayoutOptions {
  tmdbId: number;
  summary?: ArmMediaSummary;
}

const initialState: ArmEpisodeLayoutState = {
  status: "loading",
  groups: [],
  coverageState: "unresolved",
};

/**
 * Resolves Potok identity and loads the Potok Default Ordering. A missing/old ARM endpoint is a normal
 * compatibility state: callers render the existing TMDB season UI through `providerFallback`.
 */
export function useArmEpisodeLayout({ tmdbId, summary }: UseArmEpisodeLayoutOptions): ArmEpisodeLayoutState {
  const { i18n } = useTranslation();
  const [state, setState] = useState<ArmEpisodeLayoutState>(initialState);

  useEffect(() => {
    if (!tmdbId) {
      setState({ status: "providerFallback", groups: [], coverageState: "providerFallback" });
      return;
    }

    if (summary && !canReadArmLayout(summary)) {
      setState({ status: "providerFallback", groups: [], coverageState: summary.coverageState });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading", groups: [], coverageState: summary?.coverageState ?? "unresolved" });

    const load = async () => {
      try {
        let workId = canReadArmLayout(summary) ? summary.workId : null;
        if (!workId) {
          const resolved = await ApiClient.resolveArmWork(
            { provider: "tmdb", entityKind: "tv", value: String(tmdbId) },
            { locale: i18n.language, signal: controller.signal },
          );
          workId = resolved.work?.id ?? null;
        }
        if (!workId) {
          setState({ status: "providerFallback", groups: [], coverageState: "providerFallback" });
          return;
        }

        const layout = await ApiClient.fetchArmEpisodeLayout(workId, {
          locale: i18n.language,
          ordering: "default",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const groups = toEpisodeGroupPresentations(layout);
        if (groups.length === 0 || layout.resolutionState === "unresolved") {
          setState({ status: "providerFallback", groups: [], coverageState: layout.coverageState });
          return;
        }
        setState({ status: "arm", groups, coverageState: layout.coverageState });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ status: "providerFallback", groups: [], coverageState: "providerFallback" });
      }
    };

    void load();
    return () => controller.abort();
  }, [i18n.language, summary, tmdbId]);

  return state;
}

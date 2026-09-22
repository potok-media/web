import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import {
  canReadArmLayout,
  type ArmCoverageState,
  type ArmMediaSummary,
} from "../network/ArmTypes";
import {
  toEpisodeGroupPresentations,
  toProvisionalGroupPresentations,
  type EpisodeGroupPresentation,
} from "../features/arm/episodeLayoutModel";
import { getArmLayoutCached, getArmResolveCached } from "../features/arm/armLayoutCache";

type ArmEpisodeLayoutStatus = "loading" | "arm" | "provisional" | "providerFallback";

interface ArmEpisodeLayoutState {
  status: ArmEpisodeLayoutStatus;
  groups: EpisodeGroupPresentation[];
  coverageState: ArmCoverageState;
}

interface UseArmEpisodeLayoutOptions {
  tmdbId: number;
  summary?: ArmMediaSummary | null;
  /** Movies never enter the ARM season flow. */
  enabled?: boolean;
}

// Identity hydration on the backend is asynchronous; one delayed re-resolve picks up the real
// layout once it lands. Never blocks the UI — the provisional/legacy view stays on screen.
const HYDRATION_RETRY_MS = 45000;

const initialState: ArmEpisodeLayoutState = {
  status: "loading",
  groups: [],
  coverageState: "unresolved",
};

const providerFallbackState = (coverageState: ArmCoverageState): ArmEpisodeLayoutState => ({
  status: "providerFallback",
  groups: [],
  coverageState,
});

const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

/**
 * Resolves Potok identity and loads the Potok Default Ordering. A missing/old ARM endpoint is a
 * normal compatibility state: callers render the existing TMDB season UI through
 * `providerFallback`. A `providerFallback` resolve carrying a provisional layout renders that
 * TMDB-cache structure through `provisional` while hydration finishes in the background.
 */
export function useArmEpisodeLayout({
  tmdbId,
  summary,
  enabled = true,
}: UseArmEpisodeLayoutOptions): ArmEpisodeLayoutState {
  const { i18n } = useTranslation();
  const [state, setState] = useState<ArmEpisodeLayoutState>(initialState);

  const summaryWorkId = summary?.workId ?? null;
  const summaryGraphVersion = summary?.graphVersion ?? null;
  const summaryCoverageState: ArmCoverageState = summary?.coverageState ?? "unresolved";
  const summaryPresent = summary != null;
  const summaryReadable = canReadArmLayout(summary);

  useEffect(() => {
    if (!enabled || !tmdbId) {
      setState(providerFallbackState(summaryReadable ? summaryCoverageState : "providerFallback"));
      return;
    }

    if (summaryPresent && !summaryReadable) {
      setState(providerFallbackState(summaryCoverageState));
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setState({ status: "loading", groups: [], coverageState: summaryCoverageState });

    const scheduleHydrationRetry = (hydrationQueued: boolean | undefined, retry: () => void) => {
      if (!hydrationQueued || retryTimer || signal.aborted) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!signal.aborted) retry();
      }, HYDRATION_RETRY_MS);
    };

    const load = async (revalidating = false) => {
      try {
        const locale = i18n.language;
        const imageBaseUrl = ApiClient.baseURL;
        let workId = summaryReadable && summaryWorkId ? summaryWorkId : null;

        if (!workId) {
          const reference = { provider: "tmdb", entityKind: "tv", value: String(tmdbId) };
          const resolved = await getArmResolveCached(reference, locale, (ifNoneMatch) =>
            ApiClient.resolveArmWork(reference, { locale, signal, ifNoneMatch }), revalidating);
          if (signal.aborted) return;

          const provisional = resolved.provisionalLayout;
          if (resolved.coverageState === "providerFallback" && provisional?.groups.length) {
            const groups = toProvisionalGroupPresentations(provisional, { imageBaseUrl });
            if (groups.length > 0) {
              scheduleHydrationRetry(resolved.hydrationQueued, () => void load(true));
              setState({ status: "provisional", groups, coverageState: resolved.coverageState });
              return;
            }
          }

          workId = resolved.work?.id ?? null;
          if (!workId) {
            scheduleHydrationRetry(resolved.hydrationQueued, () => void load(true));
            setState(providerFallbackState(resolved.coverageState));
            return;
          }
        }

        const layout = await getArmLayoutCached(workId, "default", locale, (ifNoneMatch) =>
          ApiClient.fetchArmEpisodeLayout(workId, { locale, ordering: "default", signal, ifNoneMatch }), revalidating);
        if (signal.aborted) return;

        const groups = toEpisodeGroupPresentations(layout, { imageBaseUrl });
        if (groups.length === 0 || layout.resolutionState === "unresolved") {
          setState(providerFallbackState(layout.coverageState));
          return;
        }
        setState({ status: "arm", groups, coverageState: layout.coverageState });
      } catch (error) {
        if (signal.aborted || isAbort(error)) return;
        setState(providerFallbackState("providerFallback"));
      }
    };

    void load();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
    // Depend on summary scalars only — the object identity changes per render once the gateway
    // ships the `arm` field, and depending on it aborts the in-flight load on every render.
  }, [enabled, i18n.language, summaryWorkId, summaryGraphVersion, summaryPresent, summaryReadable, summaryCoverageState, tmdbId]);

  return state;
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import {
  canReadArmLayout,
  type ArmMediaSummary,
} from "../network/ArmTypes";
import {
  collapseKindGroupPresentations,
  overlayTmdbEpisodeMeta,
  toEpisodeGroupPresentations,
  type EpisodeGroupPresentation,
} from "../features/arm/episodeLayoutModel";
import { reconstructLayout } from "../features/arm/layoutReconstruction";
import { getArmEntriesCached, getArmEpisodesCached, getArmResolveCached } from "../features/arm/armLayoutCache";

type ArmEpisodeLayoutStatus = "loading" | "arm" | "providerFallback";

interface ArmEpisodeLayoutState {
  status: ArmEpisodeLayoutStatus;
  groups: EpisodeGroupPresentation[];
}

interface UseArmEpisodeLayoutOptions {
  tmdbId: number;
  summary?: ArmMediaSummary | null;
  /** Movies never enter the ARM season flow. */
  enabled?: boolean;
  /** ARM entry id to scope the episode load to a single group (season/movie/ova). */
  groupId?: string;
}

// Identity hydration on the backend is asynchronous; one delayed re-resolve picks up the real
// layout once it lands. Never blocks the UI — the legacy view stays on screen.
const HYDRATION_RETRY_MS = 45000;

const initialState: ArmEpisodeLayoutState = {
  status: "loading",
  groups: [],
};

const providerFallbackState: ArmEpisodeLayoutState = {
  status: "providerFallback",
  groups: [],
};

const isAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

/**
 * Resolves Potok identity and loads the ARM v2 graph layout. A missing/old ARM endpoint is a
 * normal compatibility state: callers render the existing TMDB season UI through
 * `providerFallback`. An unresolved resolve queues targeted hydration on the backend, so one
 * delayed retry picks the work up once the next graph build lands.
 */
export function useArmEpisodeLayout({
  tmdbId,
  summary,
  enabled = true,
  groupId,
}: UseArmEpisodeLayoutOptions): ArmEpisodeLayoutState {
  const { i18n } = useTranslation();
  const [state, setState] = useState<ArmEpisodeLayoutState>(initialState);

  const summaryWorkId = summary?.workId ?? null;
  const summaryGraphVersion = summary?.graphVersion ?? null;
  const summaryPresent = summary != null;
  const summaryReadable = canReadArmLayout(summary);

  useEffect(() => {
    if (!enabled || !tmdbId) {
      setState(providerFallbackState);
      return;
    }

    if (summaryPresent && !summaryReadable) {
      setState(providerFallbackState);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    setState(initialState);

    const scheduleHydrationRetry = (retry: () => void) => {
      if (retryTimer || signal.aborted) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!signal.aborted) retry();
      }, HYDRATION_RETRY_MS);
    };

    const load = async (revalidating = false) => {
      try {
        const locale = i18n.language;
        let workId = summaryReadable && summaryWorkId ? summaryWorkId : null;

        if (!workId) {
          const reference = { provider: "tmdb", entityKind: "tv", value: String(tmdbId) };
          const resolved = await getArmResolveCached(reference, locale, (ifNoneMatch) =>
            ApiClient.resolveArmWork(reference, { locale, signal, ifNoneMatch }), revalidating);
          if (signal.aborted) return;

          workId = resolved.workId ?? null;
          if (!workId) {
            scheduleHydrationRetry(() => void load(true));
            setState(providerFallbackState);
            return;
          }
        }

        // New endpoints: fetch entries + episodes in parallel, reconstruct the legacy layout shape.
        // The new episodes endpoint already carries overview / stillPath / airDate, so the old
        // TMDB overlay step is no longer needed — display metadata comes from the graph directly.
        const [entriesRes, episodesRes] = await Promise.all([
          getArmEntriesCached(workId, undefined, locale, (ifNoneMatch: string | undefined) =>
            ApiClient.getArmEntries(workId, { locale, signal, ifNoneMatch }), revalidating),
          getArmEpisodesCached(workId, groupId, locale, (ifNoneMatch: string | undefined) =>
            ApiClient.getArmEpisodes(workId, { locale, groupId, signal, ifNoneMatch }), revalidating),
        ]);
        if (signal.aborted) return;

        const layout = reconstructLayout(entriesRes.entries, episodesRes.episodes, workId, locale);

        // Structure first (never blocks the UI), then the TMDB display overlay by the bridge
        // coordinates (kept for backwards compatibility — with the new endpoint this is a no-op
        // because overview/stillPath are already present, but the call is harmless).
        const bare = collapseKindGroupPresentations(toEpisodeGroupPresentations(layout));
        if (bare.length === 0) {
          setState(providerFallbackState);
          return;
        }
        setState({ status: "arm", groups: bare });

        const overlaid = collapseKindGroupPresentations(
          await overlayTmdbEpisodeMeta(toEpisodeGroupPresentations(layout)));
        if (signal.aborted) return;
        if (overlaid.length > 0) setState({ status: "arm", groups: overlaid });
      } catch (error) {
        if (signal.aborted || isAbort(error)) return;
        setState(providerFallbackState);
      }
    };

    void load();
    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
    // Depend on summary scalars only — the object identity changes per render once the gateway
    // ships the `arm` field, and depending on it aborts the in-flight load on every render.
  }, [enabled, groupId, i18n.language, summaryWorkId, summaryGraphVersion, summaryPresent, summaryReadable, tmdbId]);

  return state;
}

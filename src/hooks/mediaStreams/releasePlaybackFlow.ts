import type { RawStreamPayload } from "@potok/sdk-types";
import { hasEpisodeParsingWarning } from "../../components/common/episodeSelector/utils";
import type { EpisodeSelectorData } from "./mediaStreamsTypes";

export type ReleasePlaybackPhase =
  | "browsing"
  | "inspecting"
  | "blocked"
  | "ready"
  | "preparing"
  | "playing"
  | "failed";

export type ReleasePlaybackMode = "direct" | "files";

export interface ReleasePlaybackValidation {
  blocked: boolean;
  issueCount: number;
}

export interface ReleasePlaybackState {
  phase: ReleasePlaybackPhase;
  mode: ReleasePlaybackMode | null;
  release: RawStreamPayload | null;
  selectorData: EpisodeSelectorData | null;
  selectedEpisodeId: string | null;
  validation: ReleasePlaybackValidation;
  error: string | null;
}

export type ReleasePlaybackEvent =
  | { type: "release-selected"; release: RawStreamPayload; mode: ReleasePlaybackMode }
  | { type: "inspection-completed"; selectorData: EpisodeSelectorData; validation: ReleasePlaybackValidation }
  | { type: "request-failed"; error: string }
  | { type: "playback-requested"; episodeId?: string }
  | { type: "playback-started" }
  | { type: "player-closed" }
  | { type: "reset" };

export const initialReleasePlaybackState: ReleasePlaybackState = {
  phase: "browsing",
  mode: null,
  release: null,
  selectorData: null,
  selectedEpisodeId: null,
  validation: { blocked: false, issueCount: 0 },
  error: null,
};

export const releasePlaybackModeFor = (
  mediaType: string | undefined,
  release: RawStreamPayload,
): ReleasePlaybackMode =>
  mediaType === "movie" && (release.kind === "hls" || release.kind === "mp4")
    ? "direct"
    : "files";

const phaseAfterInspection = (validation: ReleasePlaybackValidation): ReleasePlaybackPhase =>
  validation.blocked ? "blocked" : "ready";

export function validateReleasePlayback({
  mediaType,
  selectorData,
  canonicalBindingEnabled,
}: {
  mediaType?: string;
  selectorData: EpisodeSelectorData;
  canonicalBindingEnabled: boolean;
}): ReleasePlaybackValidation {
  if (mediaType !== "tv") return { blocked: false, issueCount: 0 };

  const issueIds = new Set<string>();
  const armState = selectorData.arm?.state;
  if (armState && armState !== "resolved") issueIds.add("release");
  if (hasEpisodeParsingWarning({
    episodes: selectorData.episodes,
    mediaType,
    parserVerdict: selectorData.parsingSuspect,
  })) issueIds.add("parsing");

  for (const episode of selectorData.episodes) {
    if (episode.resolutionState === "ambiguous" || episode.resolutionState === "unresolved") {
      issueIds.add(episode.id);
      continue;
    }

    if (!canonicalBindingEnabled) {
      if (episode.season == null || episode.episode == null) issueIds.add(episode.id);
      continue;
    }

    const hasCanonicalTarget = Boolean(
      episode.episodeId || episode.episodeIds?.length || episode.targets?.length,
    );
    if (episode.resolutionState !== "resolved" && !hasCanonicalTarget) issueIds.add(episode.id);
  }

  return { blocked: issueIds.size > 0, issueCount: issueIds.size };
}

export function releasePlaybackReducer(
  state: ReleasePlaybackState,
  event: ReleasePlaybackEvent,
): ReleasePlaybackState {
  switch (event.type) {
    case "release-selected":
      return {
        ...initialReleasePlaybackState,
        phase: "inspecting",
        mode: event.mode,
        release: event.release,
      };
    case "inspection-completed":
      return {
        ...state,
        phase: phaseAfterInspection(event.validation),
        selectorData: event.selectorData,
        validation: event.validation,
        selectedEpisodeId: null,
        error: null,
      };
    case "playback-requested":
      if (state.phase === "blocked") return state;
      return {
        ...state,
        phase: "preparing",
        selectedEpisodeId: event.episodeId ?? null,
        error: null,
      };
    case "playback-started":
      return { ...state, phase: "playing", error: null };
    case "request-failed":
      return { ...state, phase: "failed", error: event.error };
    case "player-closed":
      if (!state.selectorData) return initialReleasePlaybackState;
      return {
        ...state,
        phase: phaseAfterInspection(state.validation),
        selectedEpisodeId: null,
        error: null,
      };
    case "reset":
      return initialReleasePlaybackState;
    default:
      return state;
  }
}

import type { ActivePlayback, PlaybackMeta } from "../context/playbackTypes";

export interface PlaybackSourcePatch {
  streamUrl: string;
  streamType?: ActivePlayback["streamType"];
  voice?: string;
  startAt: number;
}

export interface PlaybackStateSnapshot {
  activePlayback: ActivePlayback | null;
  playbackMeta: PlaybackMeta;
}

/** Switch a provider source while preserving logical playback identity and metadata. */
export function switchPlaybackSourceState(
  state: PlaybackStateSnapshot,
  patch: PlaybackSourcePatch,
): PlaybackStateSnapshot {
  if (!state.activePlayback) return state;

  return {
    activePlayback: {
      ...state.activePlayback,
      streamUrl: patch.streamUrl,
      streamType: patch.streamType,
      voice: patch.voice,
      startAt: Math.max(0, patch.startAt),
      startAtZero: false,
    },
    playbackMeta: state.playbackMeta,
  };
}

/** Values that actually require a fresh media pipeline. */
export function getPlaybackPipelineKey(playback: ActivePlayback): string {
  return JSON.stringify([
    playback.streamUrl,
    playback.streamType ?? null,
    playback.streamHash ?? null,
    playback.fileIndex ?? null,
    playback.startAt ?? null,
    playback.startAtZero ?? false,
  ]);
}

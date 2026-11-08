import type { ActivePlayback, PlaybackMeta, PlaylistItem } from "../context/playbackTypes";
import { getCurrentPlaylistItem } from "../context/playbackTypes";

export interface PlaybackSourcePatch {
  streamUrl: string;
  streamType?: PlaylistItem["streamType"];
  voice?: string;
  startAt: number;
}

export interface PlaybackStateSnapshot {
  activePlayback: ActivePlayback | null;
  playbackMeta: PlaybackMeta;
}

/**
 * Switch the voice/source of the CURRENT playlist item (R3): the new stream url is patched
 * INTO `playlist[playlistIndex]` — immutably, via a replace in the array — never onto a
 * top-level descriptor field. Logical identity (episode ids, session, the rest of the queue)
 * is untouched, so the pipeline restart comes only from the changed pipeline key.
 */
export function switchPlaybackSourceState(
  state: PlaybackStateSnapshot,
  patch: PlaybackSourcePatch,
): PlaybackStateSnapshot {
  const current = state.activePlayback;
  if (!current) return state;
  const item = getCurrentPlaylistItem(current);
  // A blank streamUrl (e.g. an audio entry built without a resolved url) must never mint a
  // blank-url item — it would re-init the pipeline onto an empty src and poison every
  // consumer keyed on the current item's url (error overlay, timecodes, co-watch announce).
  if (!item || typeof patch.streamUrl !== "string" || !patch.streamUrl.trim()) return state;

  const patchedItem: PlaylistItem = {
    ...item,
    streamUrl: patch.streamUrl,
    ...(patch.streamType !== undefined ? { streamType: patch.streamType } : {}),
    ...(patch.voice !== undefined ? { voice: patch.voice } : {}),
  };

  return {
    activePlayback: {
      ...current,
      playlist: current.playlist.map((entry, index) =>
        index === current.playlistIndex ? patchedItem : entry),
      startAt: Math.max(0, patch.startAt),
      startAtZero: false,
    },
    playbackMeta: state.playbackMeta,
  };
}

/** Values that actually require a fresh media pipeline — all from the CURRENT playlist item. */
export function getPlaybackPipelineKey(playback: ActivePlayback): string {
  const item = getCurrentPlaylistItem(playback);
  return JSON.stringify([
    item?.streamUrl ?? null,
    item?.streamType ?? null,
    item?.streamHash ?? null,
    item?.fileIndex ?? null,
    playback.startAt ?? null,
    playback.startAtZero ?? false,
  ]);
}

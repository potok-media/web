import type { ActivePlayback } from "../context/playbackTypes";
import { getCurrentPlaylistItem } from "../context/playbackTypes";

export interface PlaybackIdentity {
  id: number;
  mediaType: string;
  season?: number;
  episode?: number;
  workId?: string | null;
  episodeId?: string | null;
  episodeIds?: string[];
  /** Opaque plugin-owned progress identity, used verbatim — the host never interprets it. */
  progressId?: string;
  streamUrl?: string;
}

/**
 * Identity of the CURRENT playlist item merged with the title-level id (R3): progress/resume
 * keys and sync gating read the episode from `playlist[playlistIndex]`, never top-level fields.
 */
export function currentItemIdentity(playback: ActivePlayback): PlaybackIdentity {
  const item = getCurrentPlaylistItem(playback);
  return {
    id: playback.id,
    mediaType: playback.mediaType,
    season: item?.season,
    episode: item?.episode,
    workId: item?.workId,
    episodeId: item?.episodeId,
    episodeIds: item?.episodeIds,
    progressId: item?.progressId,
    streamUrl: item?.streamUrl,
  };
}

function hasLegacyEpisode(identity: PlaybackIdentity): boolean {
  return identity.id > 0 && Number.isInteger(identity.season) && identity.season! >= 0
    && Number.isInteger(identity.episode) && identity.episode! > 0;
}

/** A file covering several episodes cannot be reported as one episode's progress. */
export function canSyncPlaybackIdentity(identity: PlaybackIdentity): boolean {
  if ((identity.episodeIds?.length ?? 0) > 1) return false;
  return !!(identity.workId && identity.episodeId)
    || (identity.mediaType === "movie" && identity.id > 0)
    || hasLegacyEpisode(identity);
}

/** Preserve existing numeric resume keys, while ARM-only and unresolved files stay distinct. */
export function playbackStorageKeys(identity: PlaybackIdentity) {
  const joined = (identity.episodeIds?.length ?? 0) > 1;
  let key: string;
  if (!joined && hasLegacyEpisode(identity)) {
    key = `${identity.id}:${identity.season}:${identity.episode}`;
  } else if (!joined && identity.workId && identity.episodeId) {
    key = `arm:${encodeURIComponent(identity.workId)}:${encodeURIComponent(identity.episodeId)}`;
  } else if (identity.mediaType === "movie" && identity.id > 0) {
    key = `${identity.id}:0:0`;
  } else if (identity.progressId) {
    key = `pid:${encodeURIComponent(identity.progressId)}`;
  } else if (joined && identity.workId) {
    key = `arm-file:${encodeURIComponent(identity.workId)}:${identity.episodeIds!.map(encodeURIComponent).join(",")}`;
  } else if (identity.streamUrl) {
    key = `stream:${encodeURIComponent(identity.streamUrl)}`;
  } else {
    key = `${identity.id}:${identity.season ?? 0}:${identity.episode ?? 0}`;
  }
  return { progressKey: `potok_progress:${key}`, resumeKey: `potok_playback_resume:${key}` };
}

import type { SaveProgressRequest } from "../../network/SyncHistoryApiClient";
import type {
  ArmEpisodeGroupId,
  ArmEpisodeId,
  ArmOrderingId,
  ArmWorkId,
} from "../../network/ArmTypes";

export interface PlaybackHistorySource {
  id: number;
  mediaType: string;
  season?: number;
  episode?: number;
  workId?: ArmWorkId | null;
  episodeId?: ArmEpisodeId | null;
  orderingId?: ArmOrderingId | null;
  groupId?: ArmEpisodeGroupId | null;
}

export function toPlaybackProgressRequest(
  playback: PlaybackHistorySource,
  progressSeconds: number,
  durationSeconds: number,
  syncTrakt: boolean,
): SaveProgressRequest {
  const tmdbId = Number.isFinite(playback.id) && playback.id > 0
    ? String(playback.id)
    : undefined;

  if (playback.workId && playback.episodeId) {
    return {
      ...(tmdbId ? { tmdbId } : {}),
      mediaType: "episode",
      workId: playback.workId,
      episodeId: playback.episodeId,
      ...(playback.orderingId ? { orderingId: playback.orderingId } : {}),
      ...(playback.groupId ? { groupId: playback.groupId } : {}),
      ...(playback.season !== undefined ? { seasonNumber: playback.season } : {}),
      ...(playback.episode !== undefined ? { episodeNumber: playback.episode } : {}),
      progressSeconds,
      durationSeconds,
      syncTrakt,
    };
  }

  return {
    ...(tmdbId ? { tmdbId } : {}),
    mediaType: playback.mediaType,
    ...(playback.season !== undefined ? { seasonNumber: playback.season } : {}),
    ...(playback.episode !== undefined ? { episodeNumber: playback.episode } : {}),
    progressSeconds,
    durationSeconds,
    syncTrakt,
  };
}

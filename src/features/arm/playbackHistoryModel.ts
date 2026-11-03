import type { SaveProgressRequest } from "../../network/SyncHistoryApiClient";
import type { LastSourcePayload } from "../../network/ApiTypes";
import type {
  ArmEpisodeId,
  ArmWorkId,
} from "../../network/ArmTypes";

export interface PlaybackHistorySource {
  id: number;
  mediaType: string;
  season?: number;
  episode?: number;
  workId?: ArmWorkId | null;
  episodeId?: ArmEpisodeId | null;
}

export function toPlaybackProgressRequest(
  playback: PlaybackHistorySource,
  progressSeconds: number,
  durationSeconds: number,
  lastSource?: LastSourcePayload,
): SaveProgressRequest {
  const tmdbId = Number.isFinite(playback.id) && playback.id > 0
    ? String(playback.id)
    : undefined;
  const lastSourcePart = lastSource ? { lastSource } : {};

  if (playback.workId && playback.episodeId) {
    return {
      ...(tmdbId ? { tmdbId } : {}),
      mediaType: "episode",
      workId: playback.workId,
      episodeId: playback.episodeId,
      ...(playback.season !== undefined ? { seasonNumber: playback.season } : {}),
      ...(playback.episode !== undefined ? { episodeNumber: playback.episode } : {}),
      progressSeconds,
      durationSeconds,
      ...lastSourcePart,
    };
  }

  return {
    ...(tmdbId ? { tmdbId } : {}),
    mediaType: playback.mediaType,
    ...(playback.season !== undefined ? { seasonNumber: playback.season } : {}),
    ...(playback.episode !== undefined ? { episodeNumber: playback.episode } : {}),
    progressSeconds,
    durationSeconds,
    ...lastSourcePart,
  };
}

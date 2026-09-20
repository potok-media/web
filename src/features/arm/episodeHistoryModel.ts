import type { MediaCard, TvEpisode } from "../../network/ApiTypes";
import type {
  ArmEpisodeGroupId,
  ArmEpisodeId,
  ArmOrderingId,
  ArmWorkId,
} from "../../network/ArmTypes";

export interface EpisodeHistoryIdentity {
  tmdbId?: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  workId?: ArmWorkId;
  episodeId?: ArmEpisodeId;
  orderingId?: ArmOrderingId;
  groupId?: ArmEpisodeGroupId;
}

export interface EpisodeWatchedState {
  episodeIds: ArmEpisodeId[];
  legacyCoordinates: { season: number; number: number }[];
}

export interface BulkEpisodeHistoryChange {
  seasonNumber?: number;
  episodeNumber?: number;
  episodeId?: ArmEpisodeId;
  groupId?: ArmEpisodeGroupId;
  isWatched: boolean;
}

export interface BulkEpisodeHistoryRequest {
  tmdbId?: string;
  mediaType: string;
  workId?: ArmWorkId;
  orderingId?: ArmOrderingId;
  changes: BulkEpisodeHistoryChange[];
}

/**
 * Produces the canonical identity used by watched/progress mutations. TMDB season and episode
 * numbers are included only when ARM published that compatibility projection.
 */
export function toEpisodeHistoryIdentity(
  media: MediaCard,
  episode: TvEpisode,
): EpisodeHistoryIdentity {
  const tmdbId = Number.isFinite(media.id) && media.id > 0 ? String(media.id) : undefined;
  if (episode.armEpisodeId && media.arm?.workId) {
    return {
      ...(tmdbId ? { tmdbId } : {}),
      mediaType: "episode",
      workId: media.arm.workId,
      episodeId: episode.armEpisodeId,
      ...(episode.armOrderingId ? { orderingId: episode.armOrderingId } : {}),
      ...(episode.armGroupId ? { groupId: episode.armGroupId } : {}),
      ...(episode.tmdbSeasonNumber !== undefined
        ? { seasonNumber: episode.tmdbSeasonNumber }
        : {}),
      ...(episode.tmdbEpisodeNumber !== undefined
        ? { episodeNumber: episode.tmdbEpisodeNumber }
        : {}),
    };
  }

  return {
    ...(tmdbId ? { tmdbId } : {}),
    mediaType: "tv",
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
  };
}

export function isEpisodeWatched(
  episode: TvEpisode,
  state: EpisodeWatchedState,
): boolean {
  if (episode.armEpisodeId) {
    if (state.episodeIds.includes(episode.armEpisodeId)) return true;
    if (episode.tmdbSeasonNumber === undefined || episode.tmdbEpisodeNumber === undefined) {
      return false;
    }
    return state.legacyCoordinates.some(
      (item) => item.season === episode.tmdbSeasonNumber
        && item.number === episode.tmdbEpisodeNumber,
    );
  }

  return state.legacyCoordinates.some(
    (item) => item.season === episode.seasonNumber && item.number === episode.episodeNumber,
  );
}

export function toBulkEpisodeHistoryRequest(
  media: MediaCard,
  episodes: TvEpisode[],
  isWatched: boolean,
): BulkEpisodeHistoryRequest {
  const tmdbId = Number.isFinite(media.id) && media.id > 0 ? String(media.id) : undefined;
  const isArmMutation = Boolean(media.arm?.workId)
    && episodes.length > 0
    && episodes.every((episode) => episode.armEpisodeId);

  if (isArmMutation) {
    const orderingId = episodes.find((episode) => episode.armOrderingId)?.armOrderingId
      ?? media.arm?.defaultOrderingId
      ?? undefined;
    return {
      ...(tmdbId ? { tmdbId } : {}),
      mediaType: "episode",
      workId: media.arm!.workId!,
      ...(orderingId ? { orderingId } : {}),
      changes: episodes.map((episode) => ({
        ...(episode.tmdbSeasonNumber !== undefined
          ? { seasonNumber: episode.tmdbSeasonNumber }
          : {}),
        ...(episode.tmdbEpisodeNumber !== undefined
          ? { episodeNumber: episode.tmdbEpisodeNumber }
          : {}),
        episodeId: episode.armEpisodeId!,
        ...(episode.armGroupId ? { groupId: episode.armGroupId } : {}),
        isWatched,
      })),
    };
  }

  return {
    ...(tmdbId ? { tmdbId } : {}),
    mediaType: media.mediaType,
    changes: episodes.map((episode) => ({
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      isWatched,
    })),
  };
}

export function applyEpisodeWatchedState(
  media: MediaCard,
  episodes: TvEpisode[],
  isWatched: boolean,
): MediaCard {
  const episodeIds = new Set(media.progress?.watchedEpisodeIds ?? []);
  const legacyCoordinates = new Map(
    (media.progress?.watchedEpisodes ?? []).map((item) => [
      `${item.season}:${item.number}`,
      item,
    ]),
  );

  for (const episode of episodes) {
    if (episode.armEpisodeId) {
      if (isWatched) episodeIds.add(episode.armEpisodeId);
      else episodeIds.delete(episode.armEpisodeId);
    }

    const season = episode.armEpisodeId ? episode.tmdbSeasonNumber : episode.seasonNumber;
    const number = episode.armEpisodeId ? episode.tmdbEpisodeNumber : episode.episodeNumber;
    if (season === undefined || number === undefined) continue;
    const key = `${season}:${number}`;
    if (isWatched) legacyCoordinates.set(key, { season, number });
    else legacyCoordinates.delete(key);
  }

  return {
    ...media,
    progress: {
      completed: media.progress?.completed ?? 0,
      aired: media.progress?.aired ?? 0,
      percentage: media.progress?.percentage ?? 0,
      ...media.progress,
      watchedEpisodes: [...legacyCoordinates.values()],
      watchedEpisodeIds: [...episodeIds],
    },
  };
}

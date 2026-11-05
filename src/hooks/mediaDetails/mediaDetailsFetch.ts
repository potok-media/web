import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";
import type { UserHistoryEntry } from "../../network/SyncApiClient";
import { Storage } from "../../utils/StorageService";
import { resizeTmdbImage, backdropSizeForQuality } from "../../utils/mediaUtils";
import type { MediaCard } from "../../network/ApiTypes";

/**
 * The single watched derivation, mirroring the server predicate: the manual is_watched flag
 * (0/0 progress rows) OR ≥90% real progress. In-progress rows (e.g. abandoned at 33%) never
 * light ticks or the hero.
 */
export const isHistoryEntryWatched = (entry: UserHistoryEntry): boolean =>
  entry.isWatched === true
  || (entry.durationSeconds > 0 && entry.progressSeconds >= entry.durationSeconds * 0.9);

export interface FetchedMediaDetails {
  media: MediaCard;
  inWatchlist: boolean;
  isFavorite: boolean;
  isWatched: boolean;
}

export async function fetchMediaDetailsData(
  mediaType: string,
  mediaId: number,
  silent: boolean,
): Promise<FetchedMediaDetails> {
  if (silent) {
    ApiClient.invalidateCache();
  }

  const data = await ApiClient.fetchMediaDetails(mediaType, mediaId);

  if (data.backdropSrc) {
    const bannerQuality = Storage.get<string>("bannerQuality", "auto");
    data.backdropSrc = resizeTmdbImage(data.backdropSrc, backdropSizeForQuality(bannerQuality));
  }

  // The server history/favorites/watchlist is the only source of library state — fetch it
  // unconditionally (SyncApiClient falls back to the guest local ledger when anonymous).
  const [favs, watch, hist] = await Promise.all([
    SyncApiClient.fetchSyncFavorites(),
    SyncApiClient.fetchSyncWatchlist(),
    SyncApiClient.fetchSyncHistory(),
  ]);

  const favActive = favs.some((f) => f.tmdbId === mediaId.toString() && f.mediaType === mediaType);
  const watchActive = watch.some((w) => w.tmdbId === mediaId.toString() && w.mediaType === mediaType);
  const watchedActive = hist.some(
    (h) =>
      (h.tmdbId === mediaId.toString() || (data.arm?.workId && h.workId === data.arm.workId)) &&
      (h.mediaType === mediaType || (mediaType === "tv" && h.mediaType === "episode")) &&
      isHistoryEntryWatched(h),
  );

  const watchedEpisodes = hist
    .filter(
      (h) =>
        h.tmdbId === mediaId.toString() &&
        h.seasonNumber !== undefined &&
        h.episodeNumber !== undefined &&
        isHistoryEntryWatched(h),
    )
    .map((h) => ({ season: h.seasonNumber!, number: h.episodeNumber! }));
  const watchedEpisodeIds = hist
    .filter(
      (h) => h.workId === data.arm?.workId && h.episodeId !== undefined && isHistoryEntryWatched(h),
    )
    .map((h) => h.episodeId!);

  data.progress = {
    completed: data.progress?.completed ?? 0,
    aired: data.progress?.aired ?? 0,
    percentage: data.progress?.percentage ?? 0,
    watchedEpisodes,
    watchedEpisodeIds,
    lastEpisodeTitle: data.progress?.lastEpisodeTitle,
    lastSeason: data.progress?.lastSeason,
    lastEpisode: data.progress?.lastEpisode,
    nextEpisodeTitle: data.progress?.nextEpisodeTitle,
    nextSeason: data.progress?.nextSeason,
    nextEpisode: data.progress?.nextEpisode,
  };
  if (mediaType === "movie") {
    data.progress.completed = watchedActive ? 100 : 0;
  } else {
    data.progress.completed = Math.max(watchedEpisodes.length, watchedEpisodeIds.length);
  }

  data.isFavorite = favActive;
  data.isInWatchlist = watchActive;

  return {
    media: data,
    inWatchlist: watchActive,
    isFavorite: favActive,
    isWatched: watchedActive,
  };
}

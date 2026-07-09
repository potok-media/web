import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";
import { Storage } from "../../utils/StorageService";
import { resizeTmdbImage, backdropSizeForQuality } from "../../utils/mediaUtils";
import type { MediaCard } from "../../network/ApiTypes";
import { checkIsWatched } from "./mediaDetailsUtils";

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

  const strategy = Storage.get<string>("syncStrategy", "none");
  if (strategy === "server") {
    const [favs, watch, hist] = await Promise.all([
      SyncApiClient.fetchSyncFavorites(),
      SyncApiClient.fetchSyncWatchlist(),
      SyncApiClient.fetchSyncHistory(),
    ]);

    const favActive = favs.some((f) => f.tmdbId === mediaId.toString() && f.mediaType === mediaType);
    const watchActive = watch.some((w) => w.tmdbId === mediaId.toString() && w.mediaType === mediaType);
    const watchedActive = hist.some(
      (h) =>
        h.tmdbId === mediaId.toString() &&
        (h.mediaType === mediaType || (mediaType === "tv" && h.mediaType === "episode")),
    );

    const watchedEpisodes = hist
      .filter(
        (h) =>
          h.tmdbId === mediaId.toString() &&
          h.seasonNumber !== undefined &&
          h.episodeNumber !== undefined,
      )
      .map((h) => ({ season: h.seasonNumber!, number: h.episodeNumber! }));

    data.progress = {
      completed: data.progress?.completed ?? 0,
      aired: data.progress?.aired ?? 0,
      percentage: data.progress?.percentage ?? 0,
      watchedEpisodes,
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
      data.progress.completed = watchedEpisodes.length;
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

  return {
    media: data,
    inWatchlist: data.isInWatchlist || false,
    isFavorite: data.isFavorite || false,
    isWatched: checkIsWatched(data),
  };
}
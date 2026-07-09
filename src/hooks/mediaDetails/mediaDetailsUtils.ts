import type { MediaCard, WatchProgress } from "../../network/ApiTypes";

export function buildTraktPayload(media: MediaCard) {
  return {
    movies: media.mediaType === "movie" ? [{ ids: { tmdb: media.id } }] : [],
    shows: media.mediaType === "tv" ? [{ ids: { tmdb: media.id } }] : [],
  };
}

export function checkIsWatched(item: MediaCard): boolean {
  if (!item.progress) return false;
  return item.mediaType === "movie"
    ? item.progress.completed > 0
    : item.progress.completed >= item.progress.aired;
}

export function mergeWatchedEpisodes(
  prev: MediaCard,
  watchedEpisodes: { season: number; number: number }[],
  mediaType: string,
  watchState?: boolean,
): MediaCard {
  const progress: WatchProgress = {
    completed: prev.progress?.completed ?? 0,
    aired: prev.progress?.aired ?? 0,
    percentage: prev.progress?.percentage ?? 0,
    watchedEpisodes,
    lastEpisodeTitle: prev.progress?.lastEpisodeTitle,
    lastSeason: prev.progress?.lastSeason,
    lastEpisode: prev.progress?.lastEpisode,
    nextEpisodeTitle: prev.progress?.nextEpisodeTitle,
    nextSeason: prev.progress?.nextSeason,
    nextEpisode: prev.progress?.nextEpisode,
  };

  if (mediaType === "movie") {
    progress.completed = watchState ? 100 : 0;
  } else {
    progress.completed = watchedEpisodes.length;
  }

  return { ...prev, progress };
}
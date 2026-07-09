import type { MediaCard } from "../network/ApiTypes";

export function areProgressEqual(
  a: MediaCard["progress"],
  b: MediaCard["progress"],
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.completed === b.completed &&
    a.aired === b.aired &&
    a.percentage === b.percentage &&
    a.lastEpisodeTitle === b.lastEpisodeTitle &&
    a.lastSeason === b.lastSeason &&
    a.lastEpisode === b.lastEpisode &&
    a.nextEpisodeTitle === b.nextEpisodeTitle &&
    a.nextSeason === b.nextSeason &&
    a.nextEpisode === b.nextEpisode
  );
}

export function areMediaCardsEqual(a: MediaCard, b: MediaCard): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.mediaType === b.mediaType &&
    a.posterSrc === b.posterSrc &&
    a.tmdbRating === b.tmdbRating &&
    a.kpRating === b.kpRating &&
    a.imdbRating === b.imdbRating &&
    a.nextEpisodeSeason === b.nextEpisodeSeason &&
    a.nextEpisodeNumber === b.nextEpisodeNumber &&
    a.isInWatchlist === b.isInWatchlist &&
    a.isFavorite === b.isFavorite &&
    areProgressEqual(a.progress, b.progress)
  );
}
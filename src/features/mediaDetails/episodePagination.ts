import type { TvEpisode } from "../../network/ApiTypes";

export const EPISODE_GRID_ROWS_PER_PAGE = 3;
export const EPISODE_GRID_MIN_CARD_WIDTH_PX = 256;
export const EPISODE_GRID_GAP_PX = 16;

export type EpisodeSortOption = "numberAsc" | "releaseDesc" | "unwatchedFirst";

export function getEpisodeGridColumnCount(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 1;
  return Math.max(
    1,
    Math.floor((width + EPISODE_GRID_GAP_PX) / (EPISODE_GRID_MIN_CARD_WIDTH_PX + EPISODE_GRID_GAP_PX)),
  );
}

function episodeNumber(episode: TvEpisode): number {
  return episode.armNumber ?? episode.episodeNumber ?? 0;
}

function airDateTimestamp(episode: TvEpisode): number {
  if (!episode.airDate) return Number.NEGATIVE_INFINITY;
  const value = Date.parse(episode.airDate);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

export function rankEpisodes(
  episodes: TvEpisode[],
  option: EpisodeSortOption,
  isWatched: (episode: TvEpisode) => boolean,
): TvEpisode[] {
  return [...episodes].sort((left, right) => {
    if (option === "releaseDesc") {
      const leftDate = airDateTimestamp(left);
      const rightDate = airDateTimestamp(right);
      if (leftDate !== rightDate) return rightDate - leftDate;
    }

    if (option === "unwatchedFirst") {
      const watchedDifference = Number(isWatched(left)) - Number(isWatched(right));
      if (watchedDifference !== 0) return watchedDifference;
    }

    return episodeNumber(left) - episodeNumber(right);
  });
}

export function getEpisodePageSize(columnCount: number): number {
  return Math.max(1, Math.floor(columnCount)) * EPISODE_GRID_ROWS_PER_PAGE;
}

export function clampEpisodePage(page: number, itemCount: number, pageSize: number): number {
  const totalPages = Math.max(1, Math.ceil(itemCount / Math.max(1, pageSize)));
  return Math.min(Math.max(0, Math.floor(page)), totalPages - 1);
}

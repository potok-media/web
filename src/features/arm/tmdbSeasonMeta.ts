import { ApiClient } from "../../network/ApiClient";
import type { TvSeason } from "../../network/ApiTypes";

/**
 * Display metadata for one TMDB season, overlaid onto the ARM layout (which deliberately
 * carries identity and structure only). Fetched through the gateway's TMDB season proxy —
 * never a direct TMDB call from the client.
 */
export interface TmdbSeasonMeta {
  /** Localized season name (e.g. "Сезон 1"), used as the group title. */
  seasonName: string;
  episodes: Map<number, TmdbEpisodeMeta>;
}

export interface TmdbEpisodeMeta {
  name: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
}

// The season payload is stable per graph release; in-flight dedup doubles as the cache.
const pending = new Map<string, Promise<TmdbSeasonMeta | null>>();

export function fetchTmdbSeasonMeta(showId: number, season: number): Promise<TmdbSeasonMeta | null> {
  const key = `${showId}:${season}`;
  let request = pending.get(key);
  if (!request) {
    request = ApiClient.fetchTvSeason(showId, season)
      .then(toMeta)
      .catch(() => null); // A failed overlay is cosmetic: the layout stays bare, never broken.
    pending.set(key, request);
  }
  return request;
}

function toMeta(season: TvSeason): TmdbSeasonMeta {
  const episodes = new Map<number, TmdbEpisodeMeta>();
  for (const episode of season.episodes ?? []) {
    episodes.set(episode.episodeNumber, {
      name: episode.name ?? "",
      overview: episode.overview ?? undefined,
      stillPath: episode.stillPath ?? episode.still_path ?? undefined,
      airDate: episode.airDate ?? undefined,
    });
  }
  return { seasonName: season.name ?? "", episodes };
}

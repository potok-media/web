import { useEffect, useState } from "react";
import { ApiClient } from "../../network/ApiClient";
import { resolveTmdbImageUrl } from "../../utils/mediaUtils";
import type { TvEpisode } from "../../network/ApiTypes";

// One fetch per (show, season) per session — the hero, rails and any other consumer share it.
const seasonCache = new Map<string, Promise<TvEpisode[]>>();

function fetchSeasonEpisodes(tvId: number, season: number): Promise<TvEpisode[]> {
  const key = `${tvId}:${season}`;
  let pending = seasonCache.get(key);
  if (!pending) {
    pending = ApiClient.fetchTvSeason(tvId, season)
      .then((seasonDetail) => seasonDetail.episodes ?? [])
      .catch(() => []);
    seasonCache.set(key, pending);
  }
  return pending;
}

/**
 * All episodes of one (show, season) from TMDB (localized). Empty array while loading / on
 * failure / for invalid input. Backed by the shared per-(show, season) promise cache.
 */
export function useSeasonEpisodes(
  tvId: number | undefined,
  season: number | undefined,
): TvEpisode[] {
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  useEffect(() => {
    let active = true;
    setEpisodes([]);
    if (tvId == null || season == null) return;
    void fetchSeasonEpisodes(tvId, season).then((list) => {
      if (active) setEpisodes(list);
    });
    return () => {
      active = false;
    };
  }, [tvId, season]);
  return episodes;
}

/**
 * "season:episode" → displayable still URL for the episode rail. Both `stillPath` and the raw
 * `still_path` spelling are honored; images resolve through the gateway TMDB proxy.
 */
export function buildSeasonStillMap(
  seasonEpisodes: TvEpisode[],
  gatewayBaseUrl: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const episode of seasonEpisodes) {
    const path = episode.stillPath || episode.still_path;
    const url = resolveTmdbImageUrl(path, gatewayBaseUrl);
    if (!url) continue;
    map.set(`${episode.seasonNumber}:${episode.episodeNumber}`, url);
  }
  return map;
}

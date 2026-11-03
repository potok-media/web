import { useEffect, useState } from "react";
import { ApiClient } from "../../network/ApiClient";
import type { TvEpisode } from "../../network/ApiTypes";

// One fetch per (show, season) per session — the hero and any other consumer share it.
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

/** Resolves an episode's name from TMDB (localized). Empty string while loading / on failure —
 * the caller hides the segment, never shows a broken placeholder. */
export function useEpisodeTitle(tvId: number | undefined, season: number | undefined, episode: number | undefined): string {
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    setName("");
    if (tvId == null || season == null || episode == null) return;
    void fetchSeasonEpisodes(tvId, season).then((episodes) => {
      if (!active) return;
      const match = episodes.find((item) => Number(item.episodeNumber) === episode);
      if (match?.name) setName(match.name);
    });
    return () => {
      active = false;
    };
  }, [tvId, season, episode]);
  return name;
}

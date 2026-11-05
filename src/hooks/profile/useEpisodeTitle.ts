import { useEffect, useState } from "react";
import { useSeasonEpisodes } from "./useSeasonEpisodes";
import type { TvEpisode } from "../../network/ApiTypes";

/** Resolves an episode's name from TMDB (localized). Empty string while loading / on failure —
 * the caller hides the segment, never shows a broken placeholder. */
export function useEpisodeTitle(tvId: number | undefined, season: number | undefined, episode: number | undefined): string {
  const episodes = useSeasonEpisodes(tvId, season);
  const [name, setName] = useState("");
  useEffect(() => {
    if (tvId == null || season == null || episode == null) {
      setName("");
      return;
    }
    const match = episodes.find((item: TvEpisode) => Number(item.episodeNumber) === episode);
    setName(match?.name || "");
  }, [tvId, season, episode, episodes]);
  return name;
}

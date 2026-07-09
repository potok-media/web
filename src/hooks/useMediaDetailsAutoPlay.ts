import { useEffect } from "react";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaDetailsAutoPlayParams {
  loading: boolean;
  media: MediaCard | null;
  playParam: string | null;
  seasonParam: string | null;
  episodeParam: string | null;
  handleNavigateToStreams: (tab?: string, season?: number, episode?: number) => void;
}

export function useMediaDetailsAutoPlay({
  loading,
  media,
  playParam,
  seasonParam,
  episodeParam,
  handleNavigateToStreams,
}: UseMediaDetailsAutoPlayParams) {
  useEffect(() => {
    if (loading || !media) return;
    const shouldPlay = playParam === "true";
    if (!shouldPlay) return;

    if (media.mediaType === "movie") {
      handleNavigateToStreams();
      return;
    }

    const deepSeason = seasonParam ? Number(seasonParam) : undefined;
    const deepEpisode = episodeParam ? Number(episodeParam) : undefined;

    if (deepSeason !== undefined && deepEpisode !== undefined) {
      handleNavigateToStreams(undefined, deepSeason, deepEpisode);
    } else if (media.progress?.nextSeason && media.progress?.nextEpisode) {
      handleNavigateToStreams(undefined, media.progress.nextSeason, media.progress.nextEpisode);
    } else if (media.progress?.lastSeason && media.progress?.lastEpisode) {
      handleNavigateToStreams(undefined, media.progress.lastSeason, media.progress.lastEpisode);
    } else {
      handleNavigateToStreams(undefined, 1, 1);
    }
  }, [loading, media, playParam, seasonParam, episodeParam, handleNavigateToStreams]);
}
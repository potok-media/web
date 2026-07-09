import { useMemo } from "react";
import { useMediaStreamsDetails } from "./useMediaStreamsDetails";
import { useMediaStreamsSourceSearch } from "./useMediaStreamsSourceSearch";
import { useMediaStreamsEpisodePlay } from "./useMediaStreamsEpisodePlay";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaStreamsParams {
  mediaType?: string;
  mediaId: number;
  season?: number;
  episode?: number;
  initialMedia?: MediaCard;
  activeTab?: string;
}

export function useMediaStreams({
  mediaType,
  mediaId,
  season,
  episode,
  initialMedia,
  activeTab: activeTabParam,
}: UseMediaStreamsParams) {
  const details = useMediaStreamsDetails({ mediaType, mediaId, initialMedia });

  const search = useMediaStreamsSourceSearch({
    mediaType,
    mediaId,
    mediaTitle: details.currentMedia?.title,
    mediaImdbId: details.currentMedia?.imdbId,
    season,
    episode,
    activeTabParam,
    loadingMediaDetails: details.loadingMediaDetails,
    onError: details.handleOnError,
  });

  const context = useMemo(
    () => ({
      type: mediaType as "movie" | "tv",
      tmdbId: mediaId,
      title: details.currentMedia?.title || "",
      season,
      episode,
    }),
    [mediaType, mediaId, details.currentMedia?.title, season, episode],
  );

  const episodePlay = useMediaStreamsEpisodePlay({
    mediaType,
    mediaId,
    currentMedia: details.currentMedia,
    activeSource: search.activeSource,
    context,
    mapEpisodesWithWatched: details.mapEpisodesWithWatched,
    onError: details.handleOnError,
  });

  return {
    loadingMediaDetails: details.loadingMediaDetails,
    currentMedia: details.currentMedia,
    sources: search.sources,
    activeTab: search.activeTab,
    setActiveTab: search.setActiveTab,
    streams: search.streams,
    loading: search.loading,
    error: search.error,
    handleRefresh: search.handleRefresh,
    handleSelectStream: episodePlay.handleSelectStream,
    clickedStream: episodePlay.clickedStream,
    setClickedStream: episodePlay.setClickedStream,
    episodeSelectorData: episodePlay.episodeSelectorData,
    setEpisodeSelectorData: episodePlay.setEpisodeSelectorData,
    handlePlayEpisode: episodePlay.handlePlayEpisode,
    handleStartEditing: episodePlay.handleStartEditing,
    handleApplyOverride: episodePlay.handleApplyOverride,
    handleResetOverride: episodePlay.handleResetOverride,
    seasons: episodePlay.seasons,
    seasonsLoading: episodePlay.seasonsLoading,
    isSaving: episodePlay.isSaving,
    actionLoading: episodePlay.actionLoading,
    handleClosePopup: episodePlay.handleClosePopup,
  };
}
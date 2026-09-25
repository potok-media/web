import { useMemo } from "react";
import { useMediaStreamsDetails } from "./useMediaStreamsDetails";
import { useMediaStreamsSourceSearch } from "./useMediaStreamsSourceSearch";
import { useMediaStreamsEpisodePlay } from "./useMediaStreamsEpisodePlay";
import { useLastSelectedStream } from "./mediaStreams/useLastSelectedStream";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaStreamsParams {
  mediaType?: string;
  mediaId: number;
  season?: number;
  episode?: number;
  workId?: string;
  orderingId?: string;
  groupId?: string;
  episodeId?: string;
  initialMedia?: MediaCard;
  activeTab?: string;
}

export function useMediaStreams({
  mediaType,
  mediaId,
  season,
  episode,
  workId,
  orderingId,
  groupId,
  episodeId,
  initialMedia,
  activeTab: activeTabParam,
}: UseMediaStreamsParams) {
  const details = useMediaStreamsDetails({ mediaType, mediaId, initialMedia });

  const search = useMediaStreamsSourceSearch({
    mediaType,
    mediaId,
    mediaTitle: details.currentMedia?.title,
    mediaOriginalTitle: details.currentMedia?.originalTitle,
    mediaEnglishTitle: details.currentMedia?.englishTitle,
    mediaImdbId: details.currentMedia?.imdbId,
    workId: workId || details.currentMedia?.arm?.workId || undefined,
    orderingId: orderingId || details.currentMedia?.arm?.defaultOrderingId || undefined,
    groupId,
    episodeId,
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
      workId: workId || details.currentMedia?.arm?.workId || undefined,
      orderingId: orderingId || details.currentMedia?.arm?.defaultOrderingId || undefined,
      groupId,
      episodeId,
      title: details.currentMedia?.title || "",
      season,
      episode,
    }),
    [mediaType, mediaId, workId, orderingId, groupId, episodeId, details.currentMedia?.arm?.workId,
      details.currentMedia?.arm?.defaultOrderingId, details.currentMedia?.title, season, episode],
  );

  const lastSelectedStream = useLastSelectedStream(mediaType, mediaId, search.activeSource?.pluginId);

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
    searchStartedAt: search.searchStartedAt,
    searchTimeoutMs: search.searchTimeoutMs,
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
    handleApplyFileOverride: episodePlay.handleApplyFileOverride,
    handleResetFileOverride: episodePlay.handleResetFileOverride,
    handleApplyEpisodeBinding: episodePlay.handleApplyEpisodeBinding,
    fileOverrideEnabled: episodePlay.fileOverrideEnabled,
    seasons: episodePlay.seasons,
    seasonsLoading: episodePlay.seasonsLoading,
    armLayout: episodePlay.armLayout,
    armLayoutLoading: episodePlay.armLayoutLoading,
    armLayoutError: episodePlay.armLayoutError,
    isSaving: episodePlay.isSaving,
    actionLoading: episodePlay.actionLoading,
    handleClosePopup: episodePlay.handleClosePopup,
    lastSelected: lastSelectedStream.lastSelected,
  };
}

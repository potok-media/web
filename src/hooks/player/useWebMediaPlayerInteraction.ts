import { useCallback, useEffect, useRef } from "react";
import { usePlayback } from "../../context/PlaybackContext";
import { useTimecodes } from "../useTimecodes";
import { usePlayerSubtitlePipeline } from "../usePlayerSubtitlePipeline";
import { useDebouncedSeek } from "../useDebouncedSeek";
import { usePlayerKeyboardControls } from "../usePlayerKeyboardControls";
import { usePlayerPlaylist } from "../usePlayerPlaylist";
import { usePlayerBufferingSpinner } from "../usePlayerBufferingSpinner";
import { usePlayerResumeToast } from "../usePlayerResumeToast";
import { usePlayerLoadingState } from "../usePlayerLoadingState";
import { usePlayerVideoError } from "../usePlayerVideoError";
import { usePlayerTrackSwitching } from "../usePlayerTrackSwitching";
import type { useWebMediaPlayerCore } from "./useWebMediaPlayerCore";
import type { UseWebMediaPlayerBindingsParams } from "./webMediaPlayerBindingTypes";

type WebMediaPlayerCore = ReturnType<typeof useWebMediaPlayerCore>;

interface UseWebMediaPlayerInteractionParams extends UseWebMediaPlayerBindingsParams {
  core: WebMediaPlayerCore;
}

export function useWebMediaPlayerInteraction({
  playback,
  videoRef,
  seekOffset,
  seekPreview,
  isBuffering,
  setIsPlaying,
  setDuration,
  setSeekPreview,
  setIsBuffering,
  setPlayerError,
  setIsClosed,
  core,
}: UseWebMediaPlayerInteractionParams) {
  const { playVideo } = usePlayback();
  const {
    metadata,
    connected,
    bytesPerSec,
    hasProgressSince,
    displayDuration,
    handleClose,
    handleUserActivity,
    menus,
    seekOffsetRef,
    handleRefreshStream,
    hls,
    octopusRef,
  } = core;

  const subtitles = usePlayerSubtitlePipeline({
    videoRef,
    seekOffsetRef,
    seekOffset,
    seekPreview,
    srcResetCounter: hls.srcResetCounter,
    currentSubtitleTrack: metadata.currentSubtitleTrack,
    injectedSubtitles: metadata.injectedSubtitles,
    setInjectedSubtitles: metadata.setInjectedSubtitles,
    setCurrentSubtitleTrack: metadata.setCurrentSubtitleTrack,
    subtitleFetchPromises: metadata.subtitleFetchPromises,
    fetchSubtitleWindow: metadata.fetchSubtitleWindow,
    octopusRef,
    subtitleTracks: metadata.subtitleTracks,
    isMetadataLoading: metadata.isMetadataLoading,
  });

  const { handleSeek, handleSeekBy } = useDebouncedSeek({
    videoRef,
    displayDuration,
    seekOffsetRef,
    setSeekPreview,
  });

  usePlayerKeyboardControls({ videoRef, handleSeekBy, handleClose, handleUserActivity });

  const { showSpinner, resetSpinner } = usePlayerBufferingSpinner(isBuffering);
  const resume = usePlayerResumeToast(playback, metadata.isMetadataLoading);

  const streamResetRef = useRef({
    resetSpinner,
    resetResumeToast: resume.resetResumeToast,
    resetMenus: menus.resetMenus,
  });
  streamResetRef.current = {
    resetSpinner,
    resetResumeToast: resume.resetResumeToast,
    resetMenus: menus.resetMenus,
  };

  // Reset player UI state only when the stream changes — not on every render.
  // (menus/resume/resetSpinner objects are unstable and must not be effect deps.)
  useEffect(() => {
    setIsClosed(false);
    setIsPlaying(false);
    setDuration(0);
    setSeekPreview(null);
    setIsBuffering(false);
    setPlayerError(null);
    streamResetRef.current.resetSpinner();
    streamResetRef.current.resetResumeToast();
    streamResetRef.current.resetMenus();
  }, [playback.streamUrl, setIsClosed, setIsPlaying, setDuration, setSeekPreview, setIsBuffering, setPlayerError]);

  const playPlaylistItem = usePlayerPlaylist(playback, playVideo);

  const handleEnded = useCallback(() => {
    if (
      playback.playlist &&
      playback.playlistIndex !== undefined &&
      playback.playlistIndex + 1 < playback.playlist.length
    ) {
      playPlaylistItem(playback.playlistIndex + 1);
    }
  }, [playback.playlist, playback.playlistIndex, playPlaylistItem]);

  const handleVideoError = usePlayerVideoError(
    playback,
    videoRef,
    setPlayerError,
    metadata.setIsMetadataLoading,
    handleRefreshStream,
  );

  const trackSwitching = usePlayerTrackSwitching({
    playback,
    videoRef,
    hlsRef: hls.hlsRef,
    seekOffset,
    rawLevels: hls.rawLevels,
    hlsActiveLevel: hls.hlsActiveLevel,
    setCurrentAudioTrack: metadata.setCurrentAudioTrack,
    setCurrentQualityLevel: hls.setCurrentQualityLevel,
    playVideo,
    setShowAudioMenu: menus.setShowAudioMenu,
    setShowQualityMenu: menus.setShowQualityMenu,
  });

  const switchSubtitle = (id: number) => {
    subtitles.switchSubtitle(id);
    menus.setShowSubtitleMenu(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    handleUserActivity();
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const timecodes = useTimecodes(
    playback.id,
    playback.season,
    playback.episode,
    playback.mediaType === "tv",
    displayDuration,
  );
  const introRange = metadata.localIntroRange || timecodes.introRange;
  const outroRange = metadata.localOutroRange || timecodes.outroRange;

  const loadingState = usePlayerLoadingState({
    isMetadataLoading: metadata.isMetadataLoading,
    playback,
    connected,
    bytesPerSec,
    isMetadataFetched: metadata.isMetadataFetched,
    hasProgressSince,
  });

  return {
    resume,
    loadingState,
    showSpinner,
    subtitles,
    handleSeek,
    handleSeekBy,
    trackSwitching,
    switchSubtitle,
    playPlaylistItem,
    togglePlay,
    introRange,
    outroRange,
    handleVideoError,
    handleEnded,
  };
}
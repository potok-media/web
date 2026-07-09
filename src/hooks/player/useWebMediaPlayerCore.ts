import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePlaybackTracker } from "../usePlaybackTracker";
import { usePlayerBackendSession } from "../usePlayerBackendSession";
import { usePlayerInactivity } from "../usePlayerInactivity";
import { usePlayerFullscreen } from "../usePlayerFullscreen";
import { usePlaybackStatus } from "../usePlaybackStatus";
import { usePlayerMetadataAndTracks } from "../usePlayerMetadataAndTracks";
import { useHlsPlayer } from "../useHlsPlayer";
import { useSubtitlesOctopus } from "../useSubtitlesOctopus";
import { usePlayerMenus } from "../usePlayerMenus";
import { usePlayerVolumePrefs } from "./usePlayerVolumePrefs";
import { useStreamRefresh } from "./useStreamRefresh";
import type { UseWebMediaPlayerBindingsParams } from "./webMediaPlayerBindingTypes";

export function useWebMediaPlayerCore({
  playback,
  onClose,
  videoRef,
  overlayRef,
  isPlaying,
  duration,
  seekOffset,
  setSeekOffset,
  setPlayerError,
  setIsClosed,
}: UseWebMediaPlayerBindingsParams) {
  const streamHash = useMemo(() => (playback.streamHash || "").toLowerCase(), [playback.streamHash]);
  const fileIndex = playback.fileIndex || "";

  const metadata = usePlayerMetadataAndTracks(
    streamHash,
    fileIndex,
    playback.streamUrl,
    playback.audios,
    playback,
  );

  const { connected, bytesPerSec, hasProgressSince } = usePlaybackStatus(
    playback.session,
    metadata.isMetadataLoading,
  );

  const displayDuration = metadata.metadataDuration > 0 ? metadata.metadataDuration : duration || 100;

  const { saveProgress } = usePlaybackTracker({
    videoRef,
    playback: useMemo(
      () => ({
        id: playback.id,
        mediaType: playback.mediaType,
        season: playback.season,
        episode: playback.episode,
      }),
      [playback.id, playback.mediaType, playback.season, playback.episode],
    ),
    seekOffset,
    isActive: isPlaying,
    duration: displayDuration,
  });

  const { closePlayer: closeBackendSession } = usePlayerBackendSession({
    playback,
    streamHash,
    fileIndex,
    onBeforeClose: saveProgress,
  });

  const handleClose = useCallback(() => {
    closeBackendSession();
    setIsClosed(true);
    onClose?.();
  }, [closeBackendSession, onClose, setIsClosed]);

  const menusRef = useRef({
    showAudioMenu: false,
    showSubtitleMenu: false,
    showQualityMenu: false,
    showPlaylistMenu: false,
  });

  const suppressControlsAutoHide = useCallback(
    () =>
      menusRef.current.showAudioMenu
      || menusRef.current.showSubtitleMenu
      || menusRef.current.showQualityMenu
      || menusRef.current.showPlaylistMenu,
    [],
  );

  const { controlsVisible, handleUserActivity } = usePlayerInactivity(videoRef, suppressControlsAutoHide);
  const { isFullscreen, toggleFullscreen } = usePlayerFullscreen(overlayRef);
  const menus = usePlayerMenus(controlsVisible);

  useEffect(() => {
    menusRef.current = {
      showAudioMenu: menus.showAudioMenu,
      showSubtitleMenu: menus.showSubtitleMenu,
      showQualityMenu: menus.showQualityMenu,
      showPlaylistMenu: menus.showPlaylistMenu,
    };
    if (suppressControlsAutoHide()) {
      handleUserActivity();
    }
  }, [
    menus.showAudioMenu,
    menus.showSubtitleMenu,
    menus.showQualityMenu,
    menus.showPlaylistMenu,
    suppressControlsAutoHide,
    handleUserActivity,
  ]);

  const seekOffsetRef = useRef(seekOffset);
  useEffect(() => {
    seekOffsetRef.current = seekOffset;
  }, [seekOffset]);

  const handleRefreshStream = useStreamRefresh({ playback, videoRef, seekOffsetRef });

  const hls = useHlsPlayer({
    videoRef,
    playback,
    currentAudioTrack: metadata.currentAudioTrack,
    setCurrentAudioTrack: metadata.setCurrentAudioTrack,
    setAudioTracks: metadata.setAudioTracks,
    syncNativeTextTracks: metadata.syncNativeTextTracks,
    setSeekOffset,
    setPlayerError,
    handleRefreshStream,
    setIsMetadataLoading: metadata.setIsMetadataLoading,
  });

  const { volume, setVolume, isMuted, setIsMuted } = usePlayerVolumePrefs(hls.srcResetCounter, videoRef);

  const octopusRef = useSubtitlesOctopus({
    videoRef,
    seekOffsetRef,
    seekOffset,
    srcResetCounter: hls.srcResetCounter,
    currentSubtitleTrack: metadata.currentSubtitleTrack,
    injectedSubtitles: metadata.injectedSubtitles,
    subtitleFetchPromises: metadata.subtitleFetchPromises,
  });

  return {
    metadata,
    connected,
    bytesPerSec,
    hasProgressSince,
    displayDuration,
    handleClose,
    controlsVisible,
    handleUserActivity,
    menus,
    seekOffsetRef,
    handleRefreshStream,
    hls,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isFullscreen,
    toggleFullscreen,
    octopusRef,
  };
}
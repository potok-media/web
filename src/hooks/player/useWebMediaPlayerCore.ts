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
import { usePlayback } from "../../context/PlaybackContext";
import type { AudioPreference } from "../../utils/hls/audioPreference";
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

  // Enrichable metadata (subtitles/duration) comes from the context atom, not the stable descriptor prop —
  // so late enrichment updates tracks/duration WITHOUT re-initializing the media pipeline. See PlaybackMeta.
  const { playbackMeta } = usePlayback();

  // Remembered audio track for the CURRENT playlist only (same torrent). Re-applied on each episode so the
  // user doesn't reselect the dub every time; reset when the playlist changes. In-memory, no persistence.
  const preferredAudioRef = useRef<AudioPreference | null>(null);
  useEffect(() => {
    preferredAudioRef.current = playback.voice ? { name: playback.voice } : null;
    // Seed once per torrent; mid-playlist user picks stay in the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamHash]);

  const metadata = usePlayerMetadataAndTracks(
    streamHash,
    fileIndex,
    playback.streamUrl,
    playback.audios,
    playback,
    playbackMeta,
  );

  const { connected, bytesPerSec, hasProgressSince } = usePlaybackStatus(
    playback.session,
    metadata.isMetadataLoading,
  );

  const timecodeDuration = metadata.metadataDuration > 0 ? metadata.metadataDuration : duration;
  const displayDuration = timecodeDuration || 100;

  const audioName = metadata.audioTracks.find((t) => t.id === metadata.currentAudioTrack)?.name
    || playback.voice;

  const { saveProgress } = usePlaybackTracker({
    videoRef,
    playback: useMemo(
      () => ({
        id: playback.id,
        mediaType: playback.mediaType,
        season: playback.season,
        episode: playback.episode,
        workId: playback.workId,
        episodeId: playback.episodeId,
        orderingId: playback.orderingId,
        groupId: playback.groupId,
        title: playback.title,
        originalTitle: playback.originalTitle,
        posterSrc: playback.posterSrc,
        backdropSrc: playback.backdropSrc,
        streamHash: playback.streamHash,
        fileIndex: playback.fileIndex,
        providerId: playback.providerId,
        voice: playback.voice,
        sourceStream: playback.sourceStream,
        startAt: playback.startAt,
        stillSrc: playback.stillSrc,
      }),
      [
        playback.id,
        playback.mediaType,
        playback.season,
        playback.episode,
        playback.workId,
        playback.episodeId,
        playback.orderingId,
        playback.groupId,
        playback.title,
        playback.originalTitle,
        playback.posterSrc,
        playback.backdropSrc,
        playback.streamHash,
        playback.fileIndex,
        playback.providerId,
        playback.voice,
        playback.sourceStream,
        playback.startAt,
        playback.stillSrc,
      ],
    ),
    seekOffset,
    isActive: isPlaying,
    duration: displayDuration,
    audioName,
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
    preferredAudioRef,
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
    preferredAudioRef,
    connected,
    bytesPerSec,
    hasProgressSince,
    displayDuration,
    timecodeDuration,
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

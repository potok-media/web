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
import { usePlayerPictureInPicture } from "./usePlayerPictureInPicture";
import { usePlayback } from "../../context/PlaybackContext";
import { getCurrentPlaylistItem } from "../../context/playbackTypes";
import { currentItemIdentity } from "../../utils/playbackIdentity";
import type { AudioPreference } from "../../utils/hls/audioPreference";
import { resolvePlaybackDuration } from "../../utils/playerTimeline";
import type { UseWebMediaPlayerBindingsParams } from "./webMediaPlayerBindingTypes";

export function useWebMediaPlayerCore({
  playback,
  onClose,
  volumeStorageKeyPrefix,
  videoRef,
  videoNode,
  overlayRef,
  isPlaying,
  duration,
  seekOffset,
  setSeekOffset,
  setPlayerError,
  setIsClosed,
}: UseWebMediaPlayerBindingsParams) {
  // R3: torrent identity, session, voices — everything content-ish lives on the CURRENT item.
  const currentItem = getCurrentPlaylistItem(playback);
  const streamHash = useMemo(() => (currentItem?.streamHash || "").toLowerCase(), [currentItem?.streamHash]);
  const fileIndex = currentItem?.fileIndex || "";

  // Enrichable metadata (subtitles/duration) comes from the context atom, not the stable descriptor prop —
  // so late enrichment updates tracks/duration WITHOUT re-initializing the media pipeline. See PlaybackMeta.
  const { playbackMeta } = usePlayback();

  // Remembered audio track for the CURRENT playlist only (same torrent / online title). Re-applied on
  // each episode so the user doesn't reselect the dub every time; reset when the streamHash changes.
  // In-memory, no persistence.
  const preferredAudioRef = useRef<AudioPreference | null>(null);
  useEffect(() => {
    preferredAudioRef.current = currentItem?.voice ? { name: currentItem.voice } : null;
    // Seed once per torrent; mid-playlist user picks stay in the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamHash]);

  const metadata = usePlayerMetadataAndTracks(
    streamHash,
    fileIndex,
    currentItem?.streamUrl ?? "",
    currentItem?.audios,
    playback,
    playbackMeta,
    preferredAudioRef,
  );

  const { connected, bytesPerSec, hasProgressSince } = usePlaybackStatus(
    currentItem?.session,
    metadata.isMetadataLoading,
  );

  const timecodeDuration = resolvePlaybackDuration(metadata.metadataDuration, duration);
  const displayDuration = timecodeDuration;

  const audioName = metadata.audioTracks.find((t) => t.id === metadata.currentAudioTrack)?.name
    || currentItem?.voice;

  const { saveProgress } = usePlaybackTracker({
    videoRef,
    videoNode,
    playback: useMemo(
      () => ({
        ...currentItemIdentity(playback),
        entryId: currentItem?.entryId,
        title: playback.title,
        originalTitle: playback.originalTitle,
        posterSrc: playback.posterSrc,
        backdropSrc: playback.backdropSrc,
        providerId: playback.providerId,
        sourceStream: playback.sourceStream,
        startAt: playback.startAt,
        stillSrc: playback.stillSrc,
        audios: currentItem?.audios,
      }),
      [
        playback,
        currentItem?.entryId,
        currentItem?.audios,
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
    showSettingsMenu: false,
    showPlaylistMenu: false,
  });

  const suppressControlsAutoHide = useCallback(
    () =>
      menusRef.current.showSettingsMenu
      || menusRef.current.showPlaylistMenu,
    [],
  );

  const { controlsVisible, handleUserActivity } = usePlayerInactivity(videoRef, suppressControlsAutoHide);
  const { isFullscreen, toggleFullscreen } = usePlayerFullscreen(overlayRef);
  const menus = usePlayerMenus(controlsVisible);

  useEffect(() => {
    menusRef.current = {
      showSettingsMenu: menus.showSettingsMenu,
      showPlaylistMenu: menus.showPlaylistMenu,
    };
    if (suppressControlsAutoHide()) {
      handleUserActivity();
    }
  }, [
    menus.showSettingsMenu,
    menus.showPlaylistMenu,
    suppressControlsAutoHide,
    handleUserActivity,
  ]);

  const seekOffsetRef = useRef(seekOffset);
  useEffect(() => {
    seekOffsetRef.current = seekOffset;
  }, [seekOffset]);

  const hls = useHlsPlayer({
    videoRef,
    videoNode,
    playback,
    currentAudioTrack: metadata.currentAudioTrack,
    setCurrentAudioTrack: metadata.setCurrentAudioTrack,
    setAudioTracks: metadata.setAudioTracks,
    preferredAudioRef,
    syncNativeTextTracks: metadata.syncNativeTextTracks,
    setSeekOffset,
    setPlayerError,
    setIsMetadataLoading: metadata.setIsMetadataLoading,
  });

  const { volume, setVolume, isMuted, setIsMuted } = usePlayerVolumePrefs(hls.srcResetCounter, videoRef, videoNode, volumeStorageKeyPrefix);

  const pictureInPicture = usePlayerPictureInPicture(videoRef, videoNode);

  const octopusRef = useSubtitlesOctopus({
    videoRef,
    videoNode,
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
    hls,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    pictureInPicture,
    isFullscreen,
    toggleFullscreen,
    octopusRef,
  };
}

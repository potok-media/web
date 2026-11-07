import React, { useEffect } from "react";
import type { ActivePlayback } from "../../context/playbackTypes";
import { useWebMediaPlayer } from "../../hooks/useWebMediaPlayer";
import { useWatchTogetherSync } from "../../hooks/player/useWatchTogetherSync";
import { useWatchTogether } from "../../context/watchTogetherState";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { PlayerCoWatchNotices } from "./PlayerCoWatchNotices";
import { PlayerCoWatchPauseOverlay } from "./PlayerCoWatchPauseOverlay";
import { PlayerCoWatchWaitOverlay } from "./PlayerCoWatchWaitOverlay";
import { PlayerOverlayStack } from "./PlayerOverlayStack";
import { PlayerVideoSurface } from "./PlayerVideoSurface";
import { PlayerChrome } from "./PlayerChrome";

const PLAYER_CHROME_SELECTOR = [
  ".player-controller-container",
  ".player-top-bar",
  ".player-stats-widget",
  ".skip-intro-overlay-btn",
  ".player-resume-toast",
  ".player-loading-overlay",
  ".player-error-overlay",
  ".player-settings-menu",
  ".selector-dropdown-menu",
].join(", ");

export interface PlayerCoreProps {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
  /** Who hosts this core — drives the inline/overlay chrome variants (class, playlist placement, co-watch rail). */
  mount: "inline" | "overlay";
  /** localStorage key prefix for persisted volume/mute prefs; each mount kind keeps its own namespace. */
  volumeStorageKeyPrefix?: string;
}

/**
 * Shared player core: video surface + co-watch overlays + chrome + notices + loading/error stack.
 * Knows nothing about WHERE it renders — InlinePlayer embeds it directly, OverlayPlayer portals it
 * into document.body. Close routing (leave room / navigate / stop) belongs to the wrappers.
 */
export const PlayerCore: React.FC<PlayerCoreProps> = (props) => {
  const { mount, volumeStorageKeyPrefix, ...playerProps } = props;
  const isInline = mount === "inline";
  const { role: coWatchRole, sessionActive: coWatchSessionActive, myPermissions, sendControl } = useWatchTogether();

  const vm = useWebMediaPlayer({ ...playerProps, volumeStorageKeyPrefix });
  useWatchTogetherSync(vm);

  // Fatal playback errors never reach plugin code (the failing "next" episode may have been resolved
  // by the host, not the plugin) — broadcast so plugin UIs can react, e.g. drop the stale highlight.
  useEffect(() => {
    if (!vm.playerError) return;
    ExtensionRegistry.broadcast("PLAYBACK_ERROR", {
      title: props.playback.title,
      mediaType: props.playback.mediaType,
      season: props.playback.season ?? null,
      episode: props.playback.episode ?? null,
      providerId: props.playback.providerId ?? null,
      message: vm.playerError,
      streamUrl: props.playback.streamUrl,
    });
  }, [vm.playerError, props.playback]);

  // A co-watch guest doesn't drive its own video — its controls request the host (if permitted) and the video
  // then follows via sync. Without permission the pause/seek controls are disabled.
  const isGuest = coWatchRole === "guest";
  const canControl = myPermissions.canControl;
  const controlDisabled = isGuest && !canControl;
  const onTogglePlay = isGuest
    ? () => { if (canControl) sendControl(vm.videoRef.current?.paused ? "play" : "pause"); }
    : vm.togglePlay;
  const onSeek = isGuest
    ? (time: number) => { if (canControl) sendControl("seek", time); }
    : vm.handleSeek;
  const onSeekBy = isGuest
    ? (delta: number) => {
        if (!canControl) return;
        const cur = vm.seekOffset + (vm.videoRef.current?.currentTime ?? 0);
        sendControl("seek", Math.max(0, cur + delta));
      }
    : vm.handleSeekBy;
  // A guest asks the host to switch episode (host validates + broadcasts to everyone); the host switches
  // directly. Without control permission the guest's selection is inert.
  const onSelectPlaylistItem = isGuest
    ? (index: number) => { if (canControl) sendControl("episode", undefined, index); }
    : vm.playPlaylistItem;

  if (vm.isClosed) return null;

  return (
    <div
      ref={vm.overlayRef}
      className={`web-player-overlay ${isInline ? "web-player-overlay--inline" : ""} ${!vm.controlsVisible ? "controls-hidden" : ""}`}
      onMouseMove={vm.handleUserActivity}
      onClick={(e) => {
        vm.handleUserActivity();
        const target = e.target as HTMLElement;
        if (target.closest(PLAYER_CHROME_SELECTOR)) return;
        vm.menus.closeAllMenus();
      }}
    >
      <PlayerVideoSurface
        videoRef={vm.videoRefCallback}
        injectedSubtitles={vm.metadata.injectedSubtitles}
        subtitleBlobUrls={vm.subtitles.subtitleBlobUrls}
        srcResetCounter={vm.hls.srcResetCounter}
        currentSubtitleTrack={vm.metadata.currentSubtitleTrack}
        autoPlay={!vm.playback.coWatch}
        volumeStorageKeyPrefix={volumeStorageKeyPrefix}
        onTogglePlay={vm.togglePlay}
        onToggleFullscreen={vm.toggleFullscreen}
        onPlayState={vm.setIsPlaying}
        onPlaying={() => {
          vm.setIsPlaying(true);
          vm.setIsMetadataLoading(false);
          vm.setIsBuffering(false);
          vm.setSeekPreview(null);
        }}
        onCanPlay={() => {
          vm.setIsMetadataLoading(false);
          vm.setIsBuffering(false);
        }}
        onSeeking={() => vm.setIsBuffering(true)}
        onSeeked={() => {
          vm.setIsBuffering(false);
          vm.setSeekPreview(null);
        }}
        onWaiting={() => vm.setIsBuffering(true)}
        onStalled={() => {}}
        onDurationChange={vm.setDuration}
        onVolumeChange={(vol, muted) => {
          vm.setVolume(vol);
          vm.setIsMuted(muted);
        }}
        onError={vm.handleVideoError}
        onEnded={vm.handleEnded}
      />
      {/* Before chrome so it dims the video but leaves the controls sharp on top. */}
      <PlayerCoWatchPauseOverlay />
      <PlayerCoWatchWaitOverlay />
      <PlayerChrome
        playback={vm.playback}
        videoRef={vm.videoRef}
        hlsRef={vm.hls.hlsRef}
        controlsVisible={vm.controlsVisible}
        isPlaying={vm.isPlaying}
        onTogglePlay={onTogglePlay}
        pauseDisabled={controlDisabled}
        seekDisabled={controlDisabled}
        episodeDisabled={controlDisabled}
        displayDuration={vm.displayDuration}
        onSeek={onSeek}
        onSeekBy={onSeekBy}
        volume={vm.volume}
        isMuted={vm.isMuted}
        showStats={vm.showStats}
        onToggleStats={() => vm.setShowStats(!vm.showStats)}
        isFullscreen={vm.isFullscreen}
        onToggleFullscreen={vm.toggleFullscreen}
        isPictureInPicture={vm.pictureInPicture.isPictureInPicture}
        isPictureInPictureSupported={vm.pictureInPicture.isPictureInPictureSupported}
        onTogglePictureInPicture={vm.pictureInPicture.togglePictureInPicture}
        onClose={vm.handleClose}
        seekOffset={vm.seekOffset}
        seekPreview={vm.seekPreview}
        introRange={vm.introRange}
        outroRange={vm.outroRange}
        audioTracks={vm.metadata.audioTracks}
        currentAudioTrack={vm.metadata.currentAudioTrack}
        onSelectAudioTrack={vm.trackSwitching.switchAudio}
        subtitleTracksUi={vm.subtitles.subtitleTracksUi}
        currentSubtitleTrack={vm.metadata.currentSubtitleTrack}
        onSelectSubtitleTrack={vm.switchSubtitle}
        qualityLevels={vm.trackSwitching.displayQualityLevels}
        currentQualityLevel={vm.hls.currentQualityLevel}
        onSelectQualityLevel={vm.trackSwitching.switchQuality}
        showSettingsMenu={vm.menus.showSettingsMenu}
        settingsMenuSection={vm.menus.settingsMenuSection}
        onOpenSettingsMenu={vm.menus.openSettingsMenu}
        onCloseSettingsMenu={vm.menus.closeSettingsMenu}
        onSettingsMenuSectionChange={vm.menus.setSettingsMenuSection}
        onSelectPlaylistItem={onSelectPlaylistItem}
        showPlaylistSelector={!isInline || vm.isFullscreen}
        coWatchInRail={isInline}
        hideTopBar={isInline && coWatchSessionActive}
        showPlaylistMenu={vm.menus.showPlaylistMenu}
        onTogglePlaylistMenu={() => {
          const next = !vm.menus.showPlaylistMenu;
          vm.menus.setShowPlaylistMenu(next);
          if (next) vm.menus.closeSettingsMenu();
        }}
        onUserActivity={vm.handleUserActivity}
      />
      <PlayerCoWatchNotices />
      {/* Rendered last so loading/error/resume overlays paint on top via DOM order (no z-index). */}
      <PlayerOverlayStack
        // A co-watch guest follows the host — no local "resume from…" prompt.
        showResumeToast={vm.resume.showResumeToast && coWatchRole !== "guest"}
        resumeTime={vm.resume.resumeTime}
        onSeek={vm.handleSeek}
        onDismissResume={() => vm.resume.setShowResumeToast(false)}
        isMetadataLoading={vm.metadata.isMetadataLoading}
        loadingState={vm.loadingState}
        showSpinner={vm.showSpinner}
        playerError={vm.playerError}
        streamUrl={vm.playback.streamUrl}
        onRefresh={vm.handleRefreshStream}
        onClose={vm.handleClose}
        isNetworkOffline={vm.isNetworkOffline}
      />
    </div>
  );
};

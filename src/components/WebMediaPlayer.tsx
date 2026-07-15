import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { ActivePlayback } from "../context/playbackTypes";
import { useWebMediaPlayer } from "../hooks/useWebMediaPlayer";
import { useWatchTogetherSync } from "../hooks/player/useWatchTogetherSync";
import { useWatchTogether } from "../context/watchTogetherState";
import { PlayerCoWatchNotices } from "./player/PlayerCoWatchNotices";
import { PlayerCoWatchPauseOverlay } from "./player/PlayerCoWatchPauseOverlay";
import { PlayerCoWatchWaitOverlay } from "./player/PlayerCoWatchWaitOverlay";
import { PlayerCoWatchChat } from "./player/PlayerCoWatchChat";
import { PlayerOverlayStack } from "./player/PlayerOverlayStack";
import { PlayerVideoSurface } from "./player/PlayerVideoSurface";
import { PlayerChrome } from "./player/PlayerChrome";

const PLAYER_CHROME_SELECTOR = [
  ".player-controller-container",
  ".player-top-bar",
  ".player-stats-widget",
  ".skip-intro-overlay-btn",
  ".player-resume-toast",
  ".player-loading-overlay",
  ".player-error-overlay",
  ".selector-dropdown-menu",
  ".wt-chat",
].join(", ");

interface WebMediaPlayerProps {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = (props) => {
  const { role: coWatchRole, myPermissions, sendControl, leave: coWatchLeave, chatOpen } = useWatchTogether();
  const navigate = useNavigate();
  const propsOnClose = props.onClose;

  // Closing the player during a co-watch ends the session: the host closes the room for everyone and returns
  // to the page it started from; a guest just leaves and goes home.
  const handlePlayerClose = useCallback(() => {
    if (coWatchRole === "host") {
      coWatchLeave();
      navigate(-1);
    } else if (coWatchRole === "guest") {
      coWatchLeave();
      navigate("/");
    }
    propsOnClose?.();
  }, [coWatchRole, coWatchLeave, navigate, propsOnClose]);

  const vm = useWebMediaPlayer({ ...props, onClose: handlePlayerClose });
  useWatchTogetherSync(vm);

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

  return createPortal(
    <div
      ref={vm.overlayRef}
      className={`web-player-overlay ${!vm.controlsVisible ? "controls-hidden" : ""} ${chatOpen ? "web-player-overlay--chat-open" : ""}`}
      onMouseMove={vm.handleUserActivity}
      onClick={(e) => {
        vm.handleUserActivity();
        const target = e.target as HTMLElement;
        if (target.closest(PLAYER_CHROME_SELECTOR)) return;
        vm.menus.closeAllMenus();
      }}
    >
      <PlayerVideoSurface
        videoRef={vm.videoRef}
        injectedSubtitles={vm.metadata.injectedSubtitles}
        subtitleBlobUrls={vm.subtitles.subtitleBlobUrls}
        srcResetCounter={vm.hls.srcResetCounter}
        currentSubtitleTrack={vm.metadata.currentSubtitleTrack}
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
        onClose={vm.handleClose}
        seekOffset={vm.seekOffset}
        seekPreview={vm.seekPreview}
        introRange={vm.introRange}
        outroRange={vm.outroRange}
        audioTracks={vm.metadata.audioTracks}
        currentAudioTrack={vm.metadata.currentAudioTrack}
        onSelectAudioTrack={vm.trackSwitching.switchAudio}
        showAudioMenu={vm.menus.showAudioMenu}
        onToggleAudioMenu={() => {
          vm.menus.setShowAudioMenu(!vm.menus.showAudioMenu);
          vm.menus.setShowSubtitleMenu(false);
          vm.menus.setShowQualityMenu(false);
          vm.menus.setShowPlaylistMenu(false);
        }}
        subtitleTracksUi={vm.subtitles.subtitleTracksUi}
        subtitlesLoading={vm.subtitles.subtitlesLoading}
        currentSubtitleTrack={vm.metadata.currentSubtitleTrack}
        onSelectSubtitleTrack={vm.switchSubtitle}
        showSubtitleMenu={vm.menus.showSubtitleMenu}
        onToggleSubtitleMenu={() => {
          vm.menus.setShowSubtitleMenu(!vm.menus.showSubtitleMenu);
          vm.menus.setShowAudioMenu(false);
          vm.menus.setShowQualityMenu(false);
          vm.menus.setShowPlaylistMenu(false);
        }}
        onUploadSubtitle={vm.subtitles.handleUploadSubtitle}
        onAddSubtitleUrl={vm.subtitles.handleAddSubtitleUrl}
        qualityLevels={vm.trackSwitching.displayQualityLevels}
        currentQualityLevel={vm.hls.currentQualityLevel}
        onSelectQualityLevel={vm.trackSwitching.switchQuality}
        showQualityMenu={vm.menus.showQualityMenu}
        onToggleQualityMenu={() => {
          vm.menus.setShowQualityMenu(!vm.menus.showQualityMenu);
          vm.menus.setShowAudioMenu(false);
          vm.menus.setShowSubtitleMenu(false);
          vm.menus.setShowPlaylistMenu(false);
        }}
        onSelectPlaylistItem={onSelectPlaylistItem}
        showPlaylistMenu={vm.menus.showPlaylistMenu}
        onTogglePlaylistMenu={() => {
          vm.menus.setShowPlaylistMenu(!vm.menus.showPlaylistMenu);
          vm.menus.setShowAudioMenu(false);
          vm.menus.setShowSubtitleMenu(false);
          vm.menus.setShowQualityMenu(false);
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
      <PlayerCoWatchChat />
    </div>,
    document.body,
  );
};
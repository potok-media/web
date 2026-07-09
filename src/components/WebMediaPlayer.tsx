import React from "react";
import { createPortal } from "react-dom";
import type { ActivePlayback } from "../context/playbackTypes";
import { useWebMediaPlayer } from "../hooks/useWebMediaPlayer";
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
].join(", ");

interface WebMediaPlayerProps {
  playback: ActivePlayback;
  onClose?: () => void;
  isNetworkOffline?: boolean;
}

export const WebMediaPlayer: React.FC<WebMediaPlayerProps> = (props) => {
  const vm = useWebMediaPlayer(props);

  if (vm.isClosed) return null;

  return createPortal(
    <div
      ref={vm.overlayRef}
      className={`web-player-overlay ${!vm.controlsVisible ? "controls-hidden" : ""}`}
      onMouseMove={vm.handleUserActivity}
      onClick={(e) => {
        vm.handleUserActivity();
        const target = e.target as HTMLElement;
        if (target.closest(PLAYER_CHROME_SELECTOR)) return;
        vm.menus.closeAllMenus();
      }}
    >
      <PlayerOverlayStack
        showResumeToast={vm.resume.showResumeToast}
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
      <PlayerChrome
        playback={vm.playback}
        videoRef={vm.videoRef}
        hlsRef={vm.hls.hlsRef}
        controlsVisible={vm.controlsVisible}
        isPlaying={vm.isPlaying}
        onTogglePlay={vm.togglePlay}
        displayDuration={vm.displayDuration}
        onSeek={vm.handleSeek}
        onSeekBy={vm.handleSeekBy}
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
        onSelectPlaylistItem={vm.playPlaylistItem}
        showPlaylistMenu={vm.menus.showPlaylistMenu}
        onTogglePlaylistMenu={() => {
          vm.menus.setShowPlaylistMenu(!vm.menus.showPlaylistMenu);
          vm.menus.setShowAudioMenu(false);
          vm.menus.setShowSubtitleMenu(false);
          vm.menus.setShowQualityMenu(false);
        }}
        onUserActivity={vm.handleUserActivity}
      />
    </div>,
    document.body,
  );
};
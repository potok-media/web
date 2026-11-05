import React, { type RefObject } from "react";
import type Hls from "hls.js";
import type { ActivePlayback } from "../../context/playbackTypes";
import type { SettingsMenuSection } from "../../hooks/usePlayerMenus";
import { PlayerTopBar } from "./PlayerTopBar";
import { SkipIntroButton } from "./SkipIntroButton";
import { SkipOutroButton } from "./SkipOutroButton";
import { PlayerStatsHUD } from "./PlayerStatsHUD";
import { PlayerControls } from "./PlayerControls";

interface PlayerChromeProps {
  playback: ActivePlayback;
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  controlsVisible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  pauseDisabled?: boolean;
  seekDisabled?: boolean;
  episodeDisabled?: boolean;
  displayDuration: number;
  onSeek: (time: number) => void;
  onSeekBy: (delta: number) => void;
  volume: number;
  isMuted: boolean;
  showStats: boolean;
  onToggleStats: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isPictureInPicture: boolean;
  isPictureInPictureSupported: boolean;
  onTogglePictureInPicture: () => void;
  onClose: () => void;
  seekOffset: number;
  seekPreview: number | null;
  introRange: { start: number; end: number } | null;
  outroRange: { start: number; end: number } | null;
  audioTracks: Array<{ id: number; name: string }>;
  currentAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  subtitleTracksUi: Array<{ id: number; name: string; loading?: boolean; error?: boolean }>;
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  qualityLevels: Array<{ id: number; name: string }>;
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
  showSettingsMenu: boolean;
  settingsMenuSection: SettingsMenuSection;
  onOpenSettingsMenu: (section?: SettingsMenuSection) => void;
  onCloseSettingsMenu: () => void;
  onSettingsMenuSectionChange: (section: SettingsMenuSection) => void;
  onSelectPlaylistItem: (index: number) => void;
  showPlaylistSelector?: boolean;
  coWatchInRail?: boolean;
  hideTopBar?: boolean;
  showPlaylistMenu: boolean;
  onTogglePlaylistMenu: () => void;
  onUserActivity?: () => void;
}

export const PlayerChrome: React.FC<PlayerChromeProps> = ({
  playback,
  videoRef,
  hlsRef,
  controlsVisible,
  isPlaying,
  onTogglePlay,
  pauseDisabled,
  seekDisabled,
  episodeDisabled,
  displayDuration,
  onSeek,
  onSeekBy,
  volume,
  isMuted,
  showStats,
  onToggleStats,
  isFullscreen,
  onToggleFullscreen,
  isPictureInPicture,
  isPictureInPictureSupported,
  onTogglePictureInPicture,
  onClose,
  seekOffset,
  seekPreview,
  introRange,
  outroRange,
  audioTracks,
  currentAudioTrack,
  onSelectAudioTrack,
  subtitleTracksUi,
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  qualityLevels,
  currentQualityLevel,
  onSelectQualityLevel,
  showSettingsMenu,
  settingsMenuSection,
  onOpenSettingsMenu,
  onCloseSettingsMenu,
  onSettingsMenuSectionChange,
  onSelectPlaylistItem,
  showPlaylistSelector = true,
  coWatchInRail = false,
  hideTopBar = false,
  showPlaylistMenu,
  onTogglePlaylistMenu,
  onUserActivity,
}) => (
  <>
    {!hideTopBar && (
      <PlayerTopBar
        title={playback.title}
        mediaType={playback.mediaType}
        season={playback.season}
        episode={playback.episode}
        onClose={onClose}
        visible={controlsVisible}
      />
    )}
    <SkipIntroButton
      videoRef={videoRef}
      seekOffset={seekOffset}
      introRange={introRange}
      displayDuration={displayDuration}
      onSeek={onSeek}
    />
    <SkipOutroButton
      videoRef={videoRef}
      seekOffset={seekOffset}
      outroRange={outroRange}
      displayDuration={displayDuration}
      onSeek={onSeek}
    />
    <PlayerStatsHUD
      showStats={showStats}
      videoRef={videoRef}
      hlsRef={hlsRef}
      isPlaying={isPlaying}
      streamUrl={playback.streamUrl}
      statusUrl={playback.session?.statusUrl || ""}
      duration={displayDuration}
      onClose={() => onToggleStats()}
    />
    <PlayerControls
      playback={playback}
      videoRef={videoRef}
      controlsVisible={controlsVisible}
      isPlaying={isPlaying}
      onTogglePlay={onTogglePlay}
      pauseDisabled={pauseDisabled}
      seekDisabled={seekDisabled}
      episodeDisabled={episodeDisabled}
      duration={displayDuration}
      onSeek={onSeek}
      onSeekBy={onSeekBy}
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={(vol) => {
        if (videoRef.current) videoRef.current.volume = vol;
      }}
      onToggleMuted={() => {
        if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
      }}
      showStats={showStats}
      onToggleStats={onToggleStats}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      isPictureInPicture={isPictureInPicture}
      isPictureInPictureSupported={isPictureInPictureSupported}
      onTogglePictureInPicture={onTogglePictureInPicture}
      audioTracks={audioTracks}
      currentAudioTrack={currentAudioTrack}
      onSelectAudioTrack={onSelectAudioTrack}
      subtitleTracks={subtitleTracksUi}
      currentSubtitleTrack={currentSubtitleTrack}
      onSelectSubtitleTrack={onSelectSubtitleTrack}
      qualityLevels={qualityLevels}
      currentQualityLevel={currentQualityLevel}
      onSelectQualityLevel={onSelectQualityLevel}
      showSettingsMenu={showSettingsMenu}
      settingsMenuSection={settingsMenuSection}
      onOpenSettingsMenu={onOpenSettingsMenu}
      onCloseSettingsMenu={onCloseSettingsMenu}
      onSettingsMenuSectionChange={onSettingsMenuSectionChange}
      playlist={playback.playlist}
      playlistIndex={playback.playlistIndex}
      onSelectPlaylistItem={onSelectPlaylistItem}
      showPlaylistSelector={showPlaylistSelector}
      coWatchInRail={coWatchInRail}
      showPlaylistMenu={showPlaylistMenu}
      onTogglePlaylistMenu={onTogglePlaylistMenu}
      seekOffset={seekOffset}
      thumbnails={playback.thumbnails}
      seekPreview={seekPreview}
      onUserActivity={onUserActivity}
    />
  </>
);

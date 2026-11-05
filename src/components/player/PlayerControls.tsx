import React from "react";
import { useTranslation } from "react-i18next";
import type { SDKThumbnails } from "../../sdk/src/types";
import type { PlaylistItem } from "../../context/playbackTypes";
import { useSkipFillers } from "../../utils/skipFillers";
import type { SettingsMenuSection } from "../../hooks/usePlayerMenus";
import { nextPlayableIndex, playlistItemLabel } from "./playlistNavigation";
import type { ActivePlayback } from "../../context/playbackTypes";
import { TimelineSlider } from "./TimelineSlider";
import { PlayerTransportControls } from "./PlayerTransportControls";
import { PlayerUtilityControls } from "./PlayerUtilityControls";

interface TrackItem {
  id: number;
  name: string;
  loading?: boolean;
  error?: boolean;
}

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  controlsVisible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  pauseDisabled?: boolean;
  seekDisabled?: boolean;
  episodeDisabled?: boolean;
  duration: number;
  onSeek: (time: number) => void;
  onSeekBy: (delta: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMuted: () => void;
  showStats: boolean;
  onToggleStats: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  audioTracks: TrackItem[];
  currentAudioTrack: number;
  onSelectAudioTrack: (id: number) => void;
  subtitleTracks: TrackItem[];
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  qualityLevels: TrackItem[];
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
  showSettingsMenu: boolean;
  settingsMenuSection: SettingsMenuSection;
  onOpenSettingsMenu: (section?: SettingsMenuSection) => void;
  onCloseSettingsMenu: () => void;
  onSettingsMenuSectionChange: (section: SettingsMenuSection) => void;
  playlist?: PlaylistItem[];
  playlistIndex?: number;
  onSelectPlaylistItem?: (index: number) => void;
  showPlaylistSelector?: boolean;
  coWatchInRail?: boolean;
  showPlaylistMenu?: boolean;
  onTogglePlaylistMenu?: () => void;
  seekOffset?: number;
  thumbnails?: SDKThumbnails;
  seekPreview?: number | null;
  onUserActivity?: () => void;
  playback: ActivePlayback;
}

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  videoRef,
  controlsVisible,
  isPlaying,
  onTogglePlay,
  pauseDisabled,
  seekDisabled,
  episodeDisabled,
  duration,
  onSeek,
  onSeekBy,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMuted,
  showStats,
  onToggleStats,
  isFullscreen,
  onToggleFullscreen,
  audioTracks,
  currentAudioTrack,
  onSelectAudioTrack,
  subtitleTracks,
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
  playlist,
  playlistIndex,
  onSelectPlaylistItem,
  showPlaylistSelector = true,
  coWatchInRail = false,
  showPlaylistMenu,
  onTogglePlaylistMenu,
  seekOffset = 0,
  thumbnails,
  seekPreview = null,
  onUserActivity,
  playback,
}) => {
  const { t } = useTranslation("player");
  const [skipFillers] = useSkipFillers();

  const hasPlaylist = playlist && playlist.length > 1;
  const prevIndex = hasPlaylist && playlistIndex !== undefined
    ? nextPlayableIndex(playlist, playlistIndex, -1, skipFillers)
    : undefined;
  const nextIndex = hasPlaylist && playlistIndex !== undefined
    ? nextPlayableIndex(playlist, playlistIndex, 1, skipFillers)
    : undefined;
  const hasPrev = prevIndex !== undefined;
  const hasNext = nextIndex !== undefined;

  const fallbackAudioTracks = React.useMemo(
    () => [{ id: -1, name: t("controls.defaultAudioTrack") }],
    [t],
  );

  const playlistItems = React.useMemo(() => {
    if (!playlist) return [];
    return playlist.map((item, idx) => ({
      id: idx,
      name: item.season !== undefined && item.episode !== undefined
        ? `S${item.season}E${item.episode} - ${item.title || t("controls.episode")}`
        : item.title || t("controls.episodeNumbered", { number: idx + 1 }),
      filler: item.filler?.status === "filler",
    }));
  }, [playlist, t]);

  const displayAudioTracks = audioTracks.length > 0 ? audioTracks : fallbackAudioTracks;
  const displayCurrentAudio = audioTracks.length > 0 ? currentAudioTrack : -1;

  return (
    <div
      className={`player-controller-container ${controlsVisible ? "visible" : ""}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        onUserActivity?.();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="player-controller-glass-pill">
        <div className="player-timeline-wrapper">
          <TimelineSlider
            videoRef={videoRef}
            onSeek={onSeek}
            initialDuration={duration}
            seekOffset={seekOffset}
            thumbnails={thumbnails}
            seekPreview={seekPreview}
            disabled={seekDisabled}
          />
        </div>

        <div className="player-controls-row">
          <PlayerTransportControls
            videoRef={videoRef}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            pauseDisabled={pauseDisabled}
            seekDisabled={seekDisabled}
            duration={duration}
            onSeekBy={onSeekBy}
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMuted={onToggleMuted}
            seekOffset={seekOffset}
            seekPreview={seekPreview}
            hasPlaylist={hasPlaylist}
            hasPrev={hasPrev}
            hasNext={hasNext}
            prevIndex={prevIndex}
            nextIndex={nextIndex}
            prevLabel={prevIndex !== undefined && playlist ? playlistItemLabel(playlist[prevIndex]) : undefined}
            nextLabel={nextIndex !== undefined && playlist ? playlistItemLabel(playlist[nextIndex]) : undefined}
            episodeDisabled={episodeDisabled}
            onSelectPlaylistItem={onSelectPlaylistItem}
          />

          <PlayerUtilityControls
            showStats={showStats}
            onToggleStats={onToggleStats}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            audioTracks={displayAudioTracks}
            currentAudioTrack={displayCurrentAudio}
            onSelectAudioTrack={onSelectAudioTrack}
            subtitleTracks={subtitleTracks}
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
            playlistItems={playlistItems}
            playlistIndex={playlistIndex}
            onSelectPlaylistItem={onSelectPlaylistItem}
            showPlaylistSelector={showPlaylistSelector}
            coWatchInRail={coWatchInRail}
            playlistDisabled={episodeDisabled}
            showPlaylistMenu={showPlaylistMenu}
            onTogglePlaylistMenu={onTogglePlaylistMenu}
            playback={playback}
          />
        </div>
      </div>
    </div>
  );
});

PlayerControls.displayName = "PlayerControls";

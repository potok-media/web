import React from "react";
import { useTranslation } from "react-i18next";
import type { SDKThumbnails } from "../../sdk/src/types";
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
  showAudioMenu: boolean;
  onToggleAudioMenu: () => void;
  subtitleTracks: TrackItem[];
  subtitlesLoading?: boolean;
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  showSubtitleMenu: boolean;
  onToggleSubtitleMenu: () => void;
  onUploadSubtitle?: (file: File) => void;
  onAddSubtitleUrl?: (url: string) => Promise<void>;
  qualityLevels: TrackItem[];
  currentQualityLevel: number;
  onSelectQualityLevel: (id: number) => void;
  showQualityMenu: boolean;
  onToggleQualityMenu: () => void;
  playlist?: { season: number; episode: number; title?: string }[];
  playlistIndex?: number;
  onSelectPlaylistItem?: (index: number) => void;
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
  showAudioMenu,
  onToggleAudioMenu,
  subtitleTracks,
  subtitlesLoading,
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  showSubtitleMenu,
  onToggleSubtitleMenu,
  onUploadSubtitle,
  onAddSubtitleUrl,
  qualityLevels,
  currentQualityLevel,
  onSelectQualityLevel,
  showQualityMenu,
  onToggleQualityMenu,
  playlist,
  playlistIndex,
  onSelectPlaylistItem,
  showPlaylistMenu,
  onTogglePlaylistMenu,
  seekOffset = 0,
  thumbnails,
  seekPreview = null,
  onUserActivity,
  playback,
}) => {
  const { t } = useTranslation("player");

  const hasPlaylist = playlist && playlist.length > 1;
  const hasPrev = hasPlaylist && playlistIndex !== undefined && playlistIndex > 0;
  const hasNext = hasPlaylist && playlistIndex !== undefined && playlistIndex + 1 < playlist.length;

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
    }));
  }, [playlist, t]);

  const displayAudioTracks = audioTracks.length > 0 ? audioTracks : fallbackAudioTracks;
  const displayCurrentAudio = audioTracks.length > 0 ? currentAudioTrack : -1;
  const anySubReady = subtitleTracks.some((track) => !track.loading && !track.error);

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
            episodeDisabled={episodeDisabled}
            playlistIndex={playlistIndex}
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
            showAudioMenu={showAudioMenu}
            onToggleAudioMenu={onToggleAudioMenu}
            subtitleTracks={subtitleTracks}
            subtitlesLoading={subtitlesLoading}
            currentSubtitleTrack={currentSubtitleTrack}
            onSelectSubtitleTrack={onSelectSubtitleTrack}
            showSubtitleMenu={showSubtitleMenu}
            onToggleSubtitleMenu={onToggleSubtitleMenu}
            onUploadSubtitle={onUploadSubtitle}
            onAddSubtitleUrl={onAddSubtitleUrl}
            qualityLevels={qualityLevels}
            currentQualityLevel={currentQualityLevel}
            onSelectQualityLevel={onSelectQualityLevel}
            showQualityMenu={showQualityMenu}
            onToggleQualityMenu={onToggleQualityMenu}
            playlistItems={playlistItems}
            playlistIndex={playlistIndex}
            onSelectPlaylistItem={onSelectPlaylistItem}
            playlistDisabled={episodeDisabled}
            showPlaylistMenu={showPlaylistMenu}
            onTogglePlaylistMenu={onTogglePlaylistMenu}
            anySubReady={anySubReady}
            playback={playback}
          />
        </div>
      </div>
    </div>
  );
});

PlayerControls.displayName = "PlayerControls";
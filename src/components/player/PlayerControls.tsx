import React from "react";
import { useTranslation } from "react-i18next";
import type { SDKThumbnails } from "../../sdk/src/types";
import {
  Play,
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize,
  Minimize,
  Captions,
  Activity,
  RotateCcw,
  RotateCw,
  Settings,
  ListVideo,
  SkipBack,
  SkipForward
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";
import { CaptionsLoadingIcon } from "./SubtitleLoadingIcons";
import { TimelineSlider } from "./TimelineSlider";
import { TimeDisplay } from "./TimeDisplay";

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
}

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  videoRef,
  controlsVisible,
  isPlaying,
  onTogglePlay,
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
}) => {
  const { t } = useTranslation("player");
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const hasPlaylist = playlist && playlist.length > 1;
  const hasPrev = hasPlaylist && playlistIndex !== undefined && playlistIndex > 0;
  const hasNext = hasPlaylist && playlistIndex !== undefined && playlistIndex + 1 < playlist.length;

  // Fallback constant array prevents re-rendering allocations
  const fallbackAudioTracks = React.useMemo(
    () => [{ id: -1, name: t("controls.defaultAudioTrack") }],
    [t]
  );

  const playlistItems = React.useMemo(() => {
    if (!playlist) return [];
    return playlist.map((item, idx) => ({
      id: idx,
      name: item.season !== undefined && item.episode !== undefined
        ? `S${item.season}E${item.episode} - ${item.title || t("controls.episode")}`
        : item.title || t("controls.episodeNumbered", { number: idx + 1 })
    }));
  }, [playlist, t]);

  const displayAudioTracks = audioTracks.length > 0
    ? audioTracks
    : fallbackAudioTracks;

  const displayCurrentAudio = audioTracks.length > 0 ? currentAudioTrack : -1;

  // The subtitle button stays disabled until at least one track's content is actually usable, and
  // keeps the animated captions-loading glyph while any track is still downloading.
  const anySubReady = subtitleTracks.some((track) => !track.loading && !track.error);

  return (
    <div 
      className={`player-controller-container ${controlsVisible ? "visible" : ""}`}
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
          />
        </div>

        <div className="player-controls-row">
          <div className="controls-group left">
            {hasPlaylist && (
              <button
                className="control-icon-btn"
                onClick={() => hasPrev && onSelectPlaylistItem?.(playlistIndex - 1)}
                disabled={!hasPrev}
                style={{ opacity: hasPrev ? 1 : 0.4, cursor: hasPrev ? "pointer" : "not-allowed" }}
                title={t("controls.prevEpisode", { defaultValue: "Previous episode" })}
                aria-label={t("controls.prevEpisode", { defaultValue: "Previous episode" })}
              >
                <SkipBack size="1.25rem" />
              </button>
            )}

            <button
              className="control-icon-btn"
              onClick={() => onSeekBy(-10)}
              title={t("controls.rewind10Title")}
              aria-label={t("controls.rewind10Aria")}
            >
              <RotateCcw size="1.125rem" />
            </button>

            <button className="control-icon-btn" onClick={onTogglePlay} aria-label={isPlaying ? t("controls.pause") : t("controls.play")}>
              {isPlaying ? <Pause size="1.25rem" fill="currentColor" /> : <Play size="1.25rem" fill="currentColor" />}
            </button>

            <button
              className="control-icon-btn"
              onClick={() => onSeekBy(10)}
              title={t("controls.forward10Title")}
              aria-label={t("controls.forward10Aria")}
            >
              <RotateCw size="1.125rem" />
            </button>

            {hasPlaylist && (
              <button
                className="control-icon-btn"
                onClick={() => hasNext && onSelectPlaylistItem?.(playlistIndex + 1)}
                disabled={!hasNext}
                style={{ opacity: hasNext ? 1 : 0.4, cursor: hasNext ? "pointer" : "not-allowed" }}
                title={t("controls.nextEpisode", { defaultValue: "Next episode" })}
                aria-label={t("controls.nextEpisode", { defaultValue: "Next episode" })}
              >
                <SkipForward size="1.25rem" />
              </button>
            )}
            
            <div className="volume-control-wrapper">
              <button className="control-icon-btn" onClick={onToggleMuted} aria-label={t("controls.toggleMute")}>
                {isMuted || volume === 0 ? <VolumeX size="1.25rem" /> : volume < 0.5 ? <Volume1 size="1.25rem" /> : <Volume2 size="1.25rem" />}
              </button>
              <input 
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={changeVolume}
                className="volume-slider"
                style={{
                  background: `linear-gradient(to right, var(--text-primary) ${ (isMuted ? 0 : volume) * 100 }%, rgba(255, 255, 255, 0.2) ${ (isMuted ? 0 : volume) * 100 }%)`
                }}
                aria-label={t("controls.volume")}
              />
            </div>

            <TimeDisplay videoRef={videoRef} initialDuration={duration} seekOffset={seekOffset} seekPreview={seekPreview} />
          </div>

          <div className="controls-group right">
            <button 
              className={`control-icon-btn ${showStats ? "active-accent" : ""}`}
              onClick={onToggleStats}
              title={t("controls.diagnosticsTitle")}
              aria-label={t("controls.diagnosticsAria")}
            >
              <Activity size="1.125rem" />
            </button>

            <TrackSelectorDropdown
              icon={<Volume2 size="1.125rem" />}
              title={t("controls.audioTracks")}
              items={displayAudioTracks}
              currentItemId={displayCurrentAudio}
              onSelect={onSelectAudioTrack}
              isOpen={showAudioMenu}
              onToggle={onToggleAudioMenu}
            />

            <TrackSelectorDropdown
              icon={subtitlesLoading ? <CaptionsLoadingIcon size="1.125rem" /> : <Captions size="1.125rem" />}
              title={t("controls.subtitles")}
              items={subtitleTracks}
              currentItemId={currentSubtitleTrack}
              onSelect={onSelectSubtitleTrack}
              isOpen={showSubtitleMenu}
              onToggle={onToggleSubtitleMenu}
              showDisableOption={true}
              disableOptionLabel={t("controls.disable")}
              onUploadSubtitle={onUploadSubtitle}
              onAddSubtitleUrl={onAddSubtitleUrl}
              disabled={!anySubReady}
            />

            {playlistItems && playlistItems.length > 0 && (
              <TrackSelectorDropdown
                icon={<ListVideo size="1.125rem" />}
                title={t("controls.playlistEpisodes")}
                items={playlistItems}
                currentItemId={playlistIndex ?? -1}
                onSelect={onSelectPlaylistItem || (() => {})}
                isOpen={showPlaylistMenu || false}
                onToggle={onTogglePlaylistMenu || (() => {})}
              />
            )}

            {qualityLevels && qualityLevels.length > 0 && (
              <TrackSelectorDropdown
                icon={<Settings size="1.125rem" />}
                title={t("controls.quality")}
                items={qualityLevels}
                currentItemId={currentQualityLevel}
                onSelect={onSelectQualityLevel}
                isOpen={showQualityMenu}
                onToggle={onToggleQualityMenu}
              />
            )}

            <button className="control-icon-btn" onClick={onToggleFullscreen} aria-label={t("controls.fullscreen")}>
              {isFullscreen ? <Minimize size="1.25rem" /> : <Maximize size="1.25rem" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerControls.displayName = "PlayerControls";

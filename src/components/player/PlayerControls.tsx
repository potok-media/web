import React from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Maximize, 
  Minimize, 
  Subtitles, 
  Activity, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  ListVideo
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";
import { TimelineSlider } from "./TimelineSlider";
import { TimeDisplay } from "./TimeDisplay";

interface TrackItem {
  id: number;
  name: string;
}

interface PlayerControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  controlsVisible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  duration: number;
  onSeek: (time: number) => void;
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
  currentSubtitleTrack: number;
  onSelectSubtitleTrack: (id: number) => void;
  showSubtitleMenu: boolean;
  onToggleSubtitleMenu: () => void;
  onUploadSubtitle?: (file: File) => void;
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
  streamHash?: string;
  fileIndex?: string;
}

// Fallback constant array prevents re-rendering allocations
const FALLBACK_AUDIO_TRACKS = [{ id: -1, name: "Основная (По умолчанию)" }];

export const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  videoRef,
  controlsVisible,
  isPlaying,
  onTogglePlay,
  duration,
  onSeek,
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
  currentSubtitleTrack,
  onSelectSubtitleTrack,
  showSubtitleMenu,
  onToggleSubtitleMenu,
  onUploadSubtitle,
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
  streamHash,
  fileIndex,
}) => {
  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const playlistItems = React.useMemo(() => {
    if (!playlist) return [];
    return playlist.map((item, idx) => ({
      id: idx,
      name: item.season !== undefined && item.episode !== undefined
        ? `S${item.season}E${item.episode} - ${item.title || "Серия"}`
        : item.title || `Серия ${idx + 1}`
    }));
  }, [playlist]);

  const displayAudioTracks = audioTracks.length > 0 
    ? audioTracks 
    : FALLBACK_AUDIO_TRACKS;

  const displayCurrentAudio = audioTracks.length > 0 ? currentAudioTrack : -1;

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
            streamHash={streamHash}
            fileIndex={fileIndex}
          />
        </div>

        <div className="player-controls-row">
          <div className="controls-group left">
            <button 
              className="control-icon-btn" 
              onClick={() => {
                const currentTime = videoRef.current?.currentTime || 0;
                const T_new = Math.max(seekOffset + currentTime - 10, 0);
                onSeek(T_new);
              }}
              title="Назад на 10 сек."
              aria-label="Назад на 10 секунд"
            >
              <RotateCcw size="1.125rem" />
            </button>

            <button className="control-icon-btn" onClick={onTogglePlay} aria-label={isPlaying ? "Пауза" : "Воспроизведение"}>
              {isPlaying ? <Pause size="1.25rem" fill="currentColor" /> : <Play size="1.25rem" fill="currentColor" />}
            </button>

            <button 
              className="control-icon-btn" 
              onClick={() => {
                const currentTime = videoRef.current?.currentTime || 0;
                const T_new = Math.min(seekOffset + currentTime + 10, duration);
                onSeek(T_new);
              }}
              title="Вперед на 10 сек."
              aria-label="Вперед на 10 секунд"
            >
              <RotateCw size="1.125rem" />
            </button>
            
            <div className="volume-control-wrapper">
              <button className="control-icon-btn" onClick={onToggleMuted} aria-label="Вкл/Выкл звук">
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
                aria-label="Громкость"
              />
            </div>

            <TimeDisplay videoRef={videoRef} initialDuration={duration} seekOffset={seekOffset} />
          </div>

          <div className="controls-group right">
            <button 
              className={`control-icon-btn ${showStats ? "active-accent" : ""}`}
              onClick={onToggleStats}
              title="Диагностика"
              aria-label="Показать диагностику"
            >
              <Activity size="1.125rem" />
            </button>

            <TrackSelectorDropdown
              icon={<Volume2 size="1.125rem" />}
              title="Аудиодорожки"
              items={displayAudioTracks}
              currentItemId={displayCurrentAudio}
              onSelect={onSelectAudioTrack}
              isOpen={showAudioMenu}
              onToggle={onToggleAudioMenu}
            />

            <TrackSelectorDropdown
              icon={<Subtitles size="1.125rem" />}
              title="Субтитры"
              items={subtitleTracks}
              currentItemId={currentSubtitleTrack}
              onSelect={onSelectSubtitleTrack}
              isOpen={showSubtitleMenu}
              onToggle={onToggleSubtitleMenu}
              showDisableOption={true}
              disableOptionLabel="Отключить"
              onUploadSubtitle={onUploadSubtitle}
              disabled={true}
            />

            {playlistItems && playlistItems.length > 0 && (
              <TrackSelectorDropdown
                icon={<ListVideo size="1.125rem" />}
                title="Серии плейлиста"
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
                title="Качество"
                items={qualityLevels}
                currentItemId={currentQualityLevel}
                onSelect={onSelectQualityLevel}
                isOpen={showQualityMenu}
                onToggle={onToggleQualityMenu}
              />
            )}

            <button className="control-icon-btn" onClick={onToggleFullscreen} aria-label="Во весь экран">
              {isFullscreen ? <Minimize size="1.25rem" /> : <Maximize size="1.25rem" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerControls.displayName = "PlayerControls";

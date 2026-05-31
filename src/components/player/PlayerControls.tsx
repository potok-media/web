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
  Settings
} from "lucide-react";
import { TrackSelectorDropdown } from "./TrackSelectorDropdown";

interface TrackItem {
  id: number;
  name: string;
}

interface PlayerControlsProps {
  controlsVisible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  bufferedTime: number;
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
}

// Format seconds into HH:MM:SS
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  controlsVisible,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  bufferedTime,
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
}) => {
  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  const timelineStyle = {
    "--timeline-progress": `${(currentTime / (duration || 100)) * 100}%`,
    "--buffer-progress": `${(bufferedTime / (duration || 100)) * 100}%`,
  } as React.CSSProperties;

  // Premium UI: Ensure selectors are always visible by providing fallbacks
  const displayAudioTracks = audioTracks.length > 0 
    ? audioTracks 
    : [{ id: -1, name: "Основная (По умолчанию)" }];

  const displayCurrentAudio = audioTracks.length > 0 ? currentAudioTrack : -1;

  return (
    <div 
      className={`player-controller-container ${controlsVisible ? "visible" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="player-controller-glass-pill">
        <div className="player-timeline-wrapper">
          <input 
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={seekTo}
            className="player-timeline-slider"
            style={timelineStyle}
            aria-label="Перемотка видео"
          />
        </div>

        <div className="player-controls-row">
          <div className="controls-group left">
            <button 
              className="control-icon-btn" 
              onClick={() => onSeek(Math.max(currentTime - 10, 0))}
              title="Назад на 10 сек."
              aria-label="Назад на 10 секунд"
            >
              <RotateCcw size={18} />
            </button>

            <button className="control-icon-btn" onClick={onTogglePlay} aria-label={isPlaying ? "Пауза" : "Воспроизведение"}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            <button 
              className="control-icon-btn" 
              onClick={() => onSeek(Math.min(currentTime + 10, duration))}
              title="Вперед на 10 сек."
              aria-label="Вперед на 10 секунд"
            >
              <RotateCw size={18} />
            </button>
            
            <div className="volume-control-wrapper">
              <button className="control-icon-btn" onClick={onToggleMuted} aria-label="Вкл/Выкл звук">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : volume < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={changeVolume}
                className="volume-slider"
                aria-label="Громкость"
              />
            </div>

            <span className="player-time-display">
              {formatTime(currentTime)} <span className="time-divider">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="controls-group right">
            <button 
              className={`control-icon-btn ${showStats ? "active-accent" : ""}`}
              onClick={onToggleStats}
              title="Показать сетевую статистику"
            >
              <Activity size={18} />
            </button>

            <TrackSelectorDropdown
              icon={<Volume2 size={18} />}
              title="Аудиодорожка"
              items={displayAudioTracks}
              currentItemId={displayCurrentAudio}
              onSelect={onSelectAudioTrack}
              isOpen={showAudioMenu}
              onToggle={onToggleAudioMenu}
            />

            <TrackSelectorDropdown
              icon={<Subtitles size={18} />}
              title="Субтитры"
              items={subtitleTracks}
              currentItemId={currentSubtitleTrack}
              onSelect={onSelectSubtitleTrack}
              isOpen={showSubtitleMenu}
              onToggle={onToggleSubtitleMenu}
              showDisableOption={true}
              disableOptionLabel="Отключить"
              onUploadSubtitle={onUploadSubtitle}
            />

            {qualityLevels && qualityLevels.length > 0 && (
              <TrackSelectorDropdown
                icon={<Settings size={18} />}
                title="Качество"
                items={qualityLevels}
                currentItemId={currentQualityLevel}
                onSelect={onSelectQualityLevel}
                isOpen={showQualityMenu}
                onToggle={onToggleQualityMenu}
              />
            )}

            <button className="control-icon-btn" onClick={onToggleFullscreen} aria-label="Во весь экран">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

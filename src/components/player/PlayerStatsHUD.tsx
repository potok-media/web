import React from "react";
import { Gauge, X } from "lucide-react";
import type Hls from "hls.js";
import { usePlayerStats } from "../../hooks/usePlayerStats";

interface PlayerStatsHUDProps {
  showStats: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  isPlaying: boolean;
  streamUrl: string;
  streamHash: string;
  duration: number;
  onClose?: () => void;
}

export const PlayerStatsHUD: React.FC<PlayerStatsHUDProps> = ({
  showStats,
  videoRef,
  hlsRef,
  isPlaying,
  streamUrl,
  streamHash,
  duration,
  onClose,
}) => {
  const [bufferSec, setBufferSec] = React.useState(0);

  const { downloadSpeed, bitrate, resolution, fps } = usePlayerStats(
    videoRef,
    hlsRef,
    isPlaying,
    showStats,
    streamUrl,
    streamHash,
    duration
  );

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !showStats) return;

    const handleTimeUpdate = () => {
      const buffered = video.buffered;
      let buf = 0;
      for (let i = 0; i < buffered.length; i++) {
        if (video.currentTime >= buffered.start(i) && video.currentTime <= buffered.end(i)) {
          buf = buffered.end(i) - video.currentTime;
          break;
        }
      }
      setBufferSec(buf);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    handleTimeUpdate();

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [videoRef, showStats]);

  if (!showStats) return null;

  return (
    <div className="player-stats-widget" onClick={(e) => e.stopPropagation()}>
      <div className="stats-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Gauge size={16} />
          <span>Статистика сети</span>
        </div>
        {onClose && (
          <button 
            className="stats-close-btn" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Закрыть"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="stats-grid">
        <div className="stats-row">
          <span className="stats-label">Скорость сети:</span>
          <span className="stats-value highlight">{downloadSpeed} МБ/с</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Битрейт потока:</span>
          <span className="stats-value">{bitrate} Mbps</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Разрешение:</span>
          <span className="stats-value">{resolution}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Буфер:</span>
          <span className="stats-value">{bufferSec.toFixed(0)} сек</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Кадры:</span>
          <span className="stats-value">{fps} fps</span>
        </div>
      </div>
    </div>
  );
};

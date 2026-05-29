import React from "react";
import { Gauge } from "lucide-react";

interface PlayerStatsHUDProps {
  showStats: boolean;
  downloadSpeed: string;
  bitrate: string;
  resolution: string;
  bufferSec: number;
  fps: number;
}

export const PlayerStatsHUD: React.FC<PlayerStatsHUDProps> = ({
  showStats,
  downloadSpeed,
  bitrate,
  resolution,
  bufferSec,
  fps,
}) => {
  if (!showStats) return null;

  return (
    <div className="player-stats-widget" onClick={(e) => e.stopPropagation()}>
      <div className="stats-header">
        <Gauge size={16} />
        <span>Статистика сети</span>
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

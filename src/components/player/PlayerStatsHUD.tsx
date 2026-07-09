import React from "react";
import { Gauge, X } from "lucide-react";
import type Hls from "hls.js";
import { useTranslation } from "react-i18next";
import { usePlayerStats } from "../../hooks/usePlayerStats";
import { IconButton } from "../ui";

interface PlayerStatsHUDProps {
  showStats: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hlsRef: React.RefObject<Hls | null>;
  isPlaying: boolean;
  streamUrl: string;
  statusUrl: string;
  duration: number;
  onClose?: () => void;
}

export const PlayerStatsHUD: React.FC<PlayerStatsHUDProps> = ({
  showStats,
  videoRef,
  hlsRef,
  isPlaying,
  streamUrl,
  statusUrl,
  duration,
  onClose,
}) => {
  const { t } = useTranslation("player");
  const [bufferSec, setBufferSec] = React.useState(0);

  const { downloadSpeed, bitrate, resolution, fps } = usePlayerStats(
    videoRef,
    hlsRef,
    isPlaying,
    showStats,
    streamUrl,
    statusUrl,
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
        <div className="stats-header-title">
          <Gauge size={16} />
          <span>{t("stats.title")}</span>
        </div>
        {onClose && (
          <IconButton
            className="stats-close-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title={t("stats.closeTitle")}
            aria-label={t("stats.closeTitle")}
          >
            <X size={16} />
          </IconButton>
        )}
      </div>
      <div className="stats-grid">
        <div className="stats-row">
          <span className="stats-label">{t("stats.networkSpeed")}</span>
          <span className="stats-value highlight">{t("stats.megabytesPerSec", { value: downloadSpeed })}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">{t("stats.streamBitrate")}</span>
          <span className="stats-value">{t("stats.mbps", { value: bitrate })}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">{t("stats.resolution")}</span>
          <span className="stats-value">{resolution}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">{t("stats.buffer")}</span>
          <span className="stats-value">{t("stats.seconds", { value: bufferSec.toFixed(0) })}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">{t("stats.frames")}</span>
          <span className="stats-value">{t("stats.fps", { value: fps })}</span>
        </div>
      </div>
    </div>
  );
};

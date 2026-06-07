import React, { useRef, useEffect } from "react";

interface TimeDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  initialDuration: number;
  seekOffset?: number;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ videoRef, initialDuration, seekOffset = 0 }) => {
  const displayRef = useRef<HTMLSpanElement>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateDisplay = () => {
      const display = displayRef.current;
      if (!display) return;
      
      // Always prefer initialDuration (from metadata) over video.duration
      // because video.duration in live/event HLS can be inaccurate
      const videoDuration = video.duration;
      const durationVal = initialDuration > 0
        ? initialDuration
        : (isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0 ? 0 : videoDuration);

      const tAbsolute = seekOffset + video.currentTime;
      const clampedTime = durationVal > 0 ? Math.min(tAbsolute, durationVal) : tAbsolute;
      const currentTime = formatTime(clampedTime);
      const duration = formatTime(durationVal);
        
      display.textContent = `${currentTime} / ${duration}`;
    };

    video.addEventListener("timeupdate", updateDisplay);
    video.addEventListener("durationchange", updateDisplay);
    
    // Initial sync
    updateDisplay();

    return () => {
      video.removeEventListener("timeupdate", updateDisplay);
      video.removeEventListener("durationchange", updateDisplay);
    };
  }, [videoRef, initialDuration, seekOffset]);

  // Initial render content with formatted initialDuration fallback
  const initialTimeStr = formatTime(seekOffset);
  const initialDurationStr = formatTime(initialDuration);

  return (
    <span ref={displayRef} className="player-time-display">
      {initialTimeStr} / {initialDurationStr}
    </span>
  );
};

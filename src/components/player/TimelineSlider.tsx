import React, { useRef, useEffect, useState } from "react";
import { TimelinePreviewTooltip } from "./TimelinePreviewTooltip";

interface TimelineSliderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek: (time: number) => void;
  initialDuration: number;
  seekOffset?: number;
  streamHash?: string;
  fileIndex?: string;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({ 
  videoRef, 
  onSeek, 
  initialDuration, 
  seekOffset = 0,
  streamHash,
  fileIndex
}) => {
  const sliderRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateSlider = () => {
      if (isDraggingRef.current) return;
      const slider = sliderRef.current;
      if (!slider) return;

      const videoDuration = video.duration;
      const duration = initialDuration > 0
        ? initialDuration
        : (isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0 ? 0 : videoDuration);

      const tAbsolute = Math.min(seekOffset + video.currentTime, duration > 0 ? duration : Infinity);
      const pct = duration > 0 ? (tAbsolute / duration) * 100 : 0;

      slider.max = duration.toString();
      slider.value = tAbsolute.toString();
      slider.style.setProperty("--timeline-progress", `${pct}%`);
    };

    const updateBuffer = () => {
      const slider = sliderRef.current;
      if (!slider) return;

      const videoDuration = video.duration;
      const duration = initialDuration > 0
        ? initialDuration
        : (isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0 ? 0 : videoDuration);

      const buffered = video.buffered;
      let bufferEnd = 0;

      for (let i = 0; i < buffered.length; i++) {
        // Add a 0.5s tolerance to start check to handle minor precision offsets
        if (video.currentTime >= buffered.start(i) - 0.5 && video.currentTime <= buffered.end(i)) {
          bufferEnd = buffered.end(i);
          break;
        }
      }
      const pct = duration > 0 ? ((seekOffset + bufferEnd) / duration) * 100 : 0;
      slider.style.setProperty("--buffer-progress", `${pct}%`);
    };

    // Update both slider and buffer on timeupdate to keep them in sync
    const handleTimeUpdate = () => {
      updateSlider();
      updateBuffer();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("progress", updateBuffer);
    video.addEventListener("durationchange", () => {
      updateSlider();
      updateBuffer();
    });

    // Initial sync
    updateSlider();
    updateBuffer();

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("progress", updateBuffer);
    };
  }, [videoRef, initialDuration, seekOffset]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    const val = parseFloat(e.target.value);
    const videoDuration = videoRef.current?.duration;
    const duration = initialDuration > 0
      ? initialDuration
      : (isNaN(videoDuration || NaN) || videoDuration === Infinity || !videoDuration ? 0 : videoDuration);
    if (duration > 0) e.target.style.setProperty("--timeline-progress", `${(val / duration) * 100}%`);
  };

  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    isDraggingRef.current = false;
    const val = parseFloat(e.currentTarget.value);
    onSeek(val);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverX, setHoverX] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const clampedX = Math.max(0, Math.min(x, width));

    setHoverX(clampedX);

    const video = videoRef.current;
    const videoDuration = video ? video.duration : 0;
    const duration = initialDuration > 0
      ? initialDuration
      : (isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0 ? 0 : videoDuration);

    const pct = clampedX / width;
    const time = pct * duration;
    setHoverTime(time);
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div
      ref={containerRef}
      className="timeline-slider-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <input
        ref={sliderRef}
        type="range"
        min={0}
        max={initialDuration}
        defaultValue={seekOffset + (videoRef.current?.currentTime || 0)}
        onChange={handleSliderChange}
        onMouseUp={handleSliderRelease}
        onTouchEnd={handleSliderRelease}
        className="player-timeline-slider"
        aria-label="Перемотка видео"
      />
      {isHovering && (
        <TimelinePreviewTooltip
          time={hoverTime}
          x={hoverX}
          streamHash={streamHash}
          fileIndex={fileIndex}
        />
      )}
    </div>
  );
};

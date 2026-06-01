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
      const isRemux = seekOffset > 0 || (videoDuration > 0 && videoDuration < 60 && initialDuration > 120);
      const duration = isRemux || isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0
        ? initialDuration
        : videoDuration;

      const tAbsolute = seekOffset + video.currentTime;
      const pct = (tAbsolute / duration) * 100;

      slider.max = duration.toString();
      slider.value = tAbsolute.toString();
      slider.style.setProperty("--timeline-progress", `${pct}%`);
    };

    const updateBuffer = () => {
      const slider = sliderRef.current;
      if (!slider) return;

      const videoDuration = video.duration;
      const isRemux = seekOffset > 0 || (videoDuration > 0 && videoDuration < 60 && initialDuration > 120);
      const duration = isRemux || isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0
        ? initialDuration
        : videoDuration;

      const buffered = video.buffered;
      let bufferEnd = 0;

      for (let i = 0; i < buffered.length; i++) {
        if (video.currentTime >= buffered.start(i) && video.currentTime <= buffered.end(i)) {
          bufferEnd = buffered.end(i);
          break;
        }
      }
      const pct = ((seekOffset + bufferEnd) / duration) * 100;
      slider.style.setProperty("--buffer-progress", `${pct}%`);
    };

    video.addEventListener("timeupdate", updateSlider);
    video.addEventListener("progress", updateBuffer);
    video.addEventListener("durationchange", () => {
      updateSlider();
      updateBuffer();
    });

    // Initial sync
    updateSlider();
    updateBuffer();

    return () => {
      video.removeEventListener("timeupdate", updateSlider);
      video.removeEventListener("progress", updateBuffer);
    };
  }, [videoRef, initialDuration, seekOffset]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isDraggingRef.current = true;
    const val = parseFloat(e.target.value);
    const videoDuration = videoRef.current?.duration;
    const isRemux = seekOffset > 0 || (videoDuration && videoDuration > 0 && videoDuration < 60 && initialDuration > 120);
    const duration = isRemux || isNaN(videoDuration || NaN) || videoDuration === Infinity || !videoDuration
      ? initialDuration
      : videoDuration;
    e.target.style.setProperty("--timeline-progress", `${(val / duration) * 100}%`);
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
    const isRemux = seekOffset > 0 || (videoDuration > 0 && videoDuration < 60 && initialDuration > 120);
    const duration = isRemux || isNaN(videoDuration) || videoDuration === Infinity || videoDuration <= 0
      ? initialDuration
      : videoDuration;

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

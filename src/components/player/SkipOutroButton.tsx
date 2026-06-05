import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

interface SkipOutroButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  seekOffset: number;
  outroRange: { start: number; end?: number } | null | undefined;
  displayDuration: number;
  onSeek: (time: number) => void;
}

export const SkipOutroButton: React.FC<SkipOutroButtonProps> = ({
  videoRef,
  seekOffset,
  outroRange,
  displayDuration,
  onSeek,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !outroRange) {
      setVisible(false);
      return;
    }

    const checkVisibility = () => {
      const displayCurrentTime = seekOffset > 0 ? (seekOffset + video.currentTime) : video.currentTime;
      const isVisible = displayCurrentTime >= outroRange.start && displayCurrentTime <= (outroRange.end || displayDuration);
      setVisible(isVisible);
    };

    video.addEventListener("timeupdate", checkVisibility);
    checkVisibility();

    return () => {
      video.removeEventListener("timeupdate", checkVisibility);
    };
  }, [videoRef, seekOffset, outroRange, displayDuration]);

  if (!visible || !outroRange) return null;

  return (
    <button
      className="skip-intro-overlay-btn outro-btn"
      onClick={(e) => {
        e.stopPropagation();
        onSeek(Math.min(outroRange.end || displayDuration, displayDuration - 1));
      }}
    >
      <span>Пропустить титры</span>
      <ChevronRight size={18} />
    </button>
  );
};

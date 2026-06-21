import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SkipIntroButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  seekOffset: number;
  introRange: { start: number; end: number } | null | undefined;
  displayDuration: number;
  onSeek: (time: number) => void;
}

export const SkipIntroButton: React.FC<SkipIntroButtonProps> = ({
  videoRef,
  seekOffset,
  introRange,
  displayDuration,
  onSeek,
}) => {
  const { t } = useTranslation("player");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !introRange) {
      setVisible(false);
      return;
    }

    const checkVisibility = () => {
      const displayCurrentTime = seekOffset > 0 ? (seekOffset + video.currentTime) : video.currentTime;
      const isVisible = displayCurrentTime >= introRange.start && displayCurrentTime <= introRange.end;
      setVisible(isVisible);
    };

    video.addEventListener("timeupdate", checkVisibility);
    checkVisibility();

    return () => {
      video.removeEventListener("timeupdate", checkVisibility);
    };
  }, [videoRef, seekOffset, introRange, displayDuration]);

  if (!visible || !introRange) return null;

  return (
    <button
      className="skip-intro-overlay-btn"
      onClick={(e) => {
        e.stopPropagation();
        onSeek(introRange.end);
      }}
    >
      <span>{t("skip.intro")}</span>
      <ChevronRight size={18} />
    </button>
  );
};

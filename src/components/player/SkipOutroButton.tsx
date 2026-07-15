import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui";
import { useWatchTogether } from "../../context/watchTogetherState";

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
  const { t } = useTranslation("player");
  const { role } = useWatchTogether();
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

  // In a co-watch, skipping is host-authoritative — only the host sees the skip button.
  if (role === "guest" || !visible || !outroRange) return null;

  return (
    <Button
      variant="glass"
      className="skip-intro-overlay-btn outro-btn"
      onClick={(e) => {
        e.stopPropagation();
        onSeek(Math.min(outroRange.end || displayDuration, displayDuration - 1));
      }}
    >
      <span>{t("skip.outro")}</span>
      <ChevronRight size={18} />
    </Button>
  );
};

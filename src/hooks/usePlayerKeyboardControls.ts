import { useEffect } from "react";

interface KeyboardControlsParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  seekOffset: number;
  handleSeek: (time: number) => void;
  handleClose: () => void;
  handleUserActivity: () => void;
}

export function usePlayerKeyboardControls({
  videoRef,
  seekOffset,
  handleSeek,
  handleClose,
  handleUserActivity,
}: KeyboardControlsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (e.key === " ") {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
        handleUserActivity();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(video.currentTime + seekOffset + 10);
        handleUserActivity();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(Math.max(video.currentTime + seekOffset - 10, 0));
        handleUserActivity();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoRef, seekOffset, handleSeek, handleClose, handleUserActivity]);
}

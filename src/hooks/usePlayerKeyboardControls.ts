import { useEffect } from "react";

interface KeyboardControlsParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleSeekBy: (delta: number) => void;
  handleClose: () => void;
  handleUserActivity: () => void;
}

export function usePlayerKeyboardControls({
  videoRef,
  handleSeekBy,
  handleClose,
  handleUserActivity,
}: KeyboardControlsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true"
      )) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      if (e.key === " ") {
        e.preventDefault();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
        handleUserActivity();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeekBy(10);
        handleUserActivity();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeekBy(-10);
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
  }, [videoRef, handleSeekBy, handleClose, handleUserActivity]);
}

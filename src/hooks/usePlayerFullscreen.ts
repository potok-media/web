import { useState, useEffect, useCallback } from "react";

export function usePlayerFullscreen(overlayRef: React.RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch((err) => {
        console.error("[WebMediaPlayer] Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("[WebMediaPlayer] Failed to exit fullscreen:", err);
      });
    }
  }, [overlayRef]);

  return { isFullscreen, toggleFullscreen };
}

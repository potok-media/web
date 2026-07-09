import { useCallback, useEffect } from "react";
import { usePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";

export function useAppLayoutPlayback() {
  const { activePlayback, playVideo, stopVideo } = usePlayback();

  useEffect(() => {
    const saved = sessionStorage.getItem("potok_last_playback");
    if (saved && !activePlayback) {
      try {
        playVideo(JSON.parse(saved));
      } catch (e) {
        logger.error("Failed to restore playback from sessionStorage", e);
        sessionStorage.removeItem("potok_last_playback");
      }
    }
  }, []);

  useEffect(() => {
    if (activePlayback) {
      sessionStorage.setItem("potok_last_playback", JSON.stringify(activePlayback));
    }
  }, [activePlayback]);

  const handleClosePlayer = useCallback(() => {
    sessionStorage.removeItem("potok_last_playback");
    stopVideo();
  }, [stopVideo]);

  return { activePlayback, handleClosePlayer };
}
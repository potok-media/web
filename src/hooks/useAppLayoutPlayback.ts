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
    // Mount-only: restore the last playback once. Re-running on activePlayback/playVideo
    // changes would re-trigger the restore, so those are intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
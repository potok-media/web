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
    // Persist only a solo playback so an accidental reload can restore it. A co-watch playback is tied to a
    // live SignalR session that dies on reload — persisting it would restore a solo zombie player — so we
    // actively clear the slot for co-watch and when playback stops (covers the host-ended path that stops
    // the video without going through handleClosePlayer).
    if (activePlayback && !activePlayback.coWatch) {
      sessionStorage.setItem("potok_last_playback", JSON.stringify(activePlayback));
    } else {
      sessionStorage.removeItem("potok_last_playback");
    }
  }, [activePlayback]);

  const handleClosePlayer = useCallback(() => {
    sessionStorage.removeItem("potok_last_playback");
    stopVideo();
  }, [stopVideo]);

  return { activePlayback, handleClosePlayer };
}
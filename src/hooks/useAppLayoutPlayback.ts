import { useCallback, useEffect, useRef } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { usePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";

// Routes where playback is allowed to keep running in the background. Everywhere else the player is
// KILLED on arrival — leaving the player page stops playback (the unmount saves progress and closes
// the backend session), no background audio, no health pings. An inline player additionally dies the
// moment its host page unmounts — no portal re-targeting, no fullscreen fallback.
const PLAYER_HOST_PATTERNS = [
  "media/:mediaType/:id/watch",
  "media/:mediaType/:id/watch/:tab",
  "continue-watch",
  "watch-together",
];

export function useAppLayoutPlayback() {
  const { activePlayback, playbackMeta, playVideo, stopVideo } = usePlayback();
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = location.pathname;
    if (!activePlayback) return;
    // Playback starting (or restoring from the session slot) on the CURRENT route is not a
    // leave — only a real pathname change to a non-host route kills the player.
    if (previousPathname === location.pathname) return;
    if (PLAYER_HOST_PATTERNS.some((pattern) => matchPath(pattern, location.pathname))) return;
    stopVideo();
  }, [location.pathname, activePlayback, stopVideo]);

  useEffect(() => {
    const saved = sessionStorage.getItem("potok_last_playback");
    if (saved && !activePlayback) {
      try {
        // Restore always opens the overlay player — the original inline host may not exist anymore
        // (reload lands wherever the URL says), and nothing else is allowed to resurrect a player.
        playVideo({ ...JSON.parse(saved), mount: "overlay" });
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
      // Merge the enrichable atom back onto the descriptor so restore-after-reload keeps the freshest
      // subtitles/duration (they no longer live on activePlayback — playVideo re-seeds the atom from these).
      sessionStorage.setItem("potok_last_playback", JSON.stringify({ ...activePlayback, ...playbackMeta }));
    } else {
      sessionStorage.removeItem("potok_last_playback");
    }
  }, [activePlayback, playbackMeta]);

  const handleClosePlayer = useCallback(() => {
    sessionStorage.removeItem("potok_last_playback");
    stopVideo();
  }, [stopVideo]);

  return { activePlayback, handleClosePlayer };
}
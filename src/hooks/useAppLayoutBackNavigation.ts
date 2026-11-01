import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PlatformManager } from "../utils/PlatformManager";
import { usePlayback } from "../context/PlaybackContext";
import { useWatchTogether } from "../context/watchTogetherState";

export function useAppLayoutBackNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePlayback, stopVideo } = usePlayback();
  const watchTogether = useWatchTogether();

  useEffect(() => {
    const handleBackPressed = (e: Event) => {
      if (e.defaultPrevented) return;

      // A player is open: back closes it and keeps the user on the page. Navigating away would
      // unregister the workspace portal target and orphan the playback in the fullscreen portal —
      // this must hold on plugin pages exactly as it does on host pages.
      if (activePlayback) {
        e.preventDefault();
        if (activePlayback.coWatch) watchTogether.leave();
        stopVideo();
        return;
      }

      const isHome = location.pathname === "/";
      if (isHome) {
        PlatformManager.exitApp();
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("potok-back-pressed", handleBackPressed);
    return () => {
      window.removeEventListener("potok-back-pressed", handleBackPressed);
    };
  }, [location.pathname, navigate, activePlayback, stopVideo, watchTogether]);
}
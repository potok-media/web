/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useHUD } from "./useHUD";
import { logger } from "../utils/logger";
import { PlatformManager } from "../utils/PlatformManager";
import { cleanStreamUrlForExternalPlayer } from "../utils/playbackUrl";
import { useSettings } from "./SettingsContext";
import { useAuth } from "./AuthContext";
import type { ActivePlayback } from "./playbackTypes";

export type { ActivePlayback, PlaylistItem } from "./playbackTypes";

export interface PlaybackContextType {
  activePlayback: ActivePlayback | null;
  playVideo: (playback: ActivePlayback) => void;
  enrichPlayback: (
    patch: Partial<ActivePlayback>,
    match?: { streamHash?: string; fileIndex?: string },
  ) => void;
  stopVideo: () => void;
}

export const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { defaultPlayer } = useSettings();
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const [activePlayback, setActivePlayback] = useState<ActivePlayback | null>(null);

  const playVideo = useCallback(
    (playback: ActivePlayback) => {
      if (PlatformManager.playVideo(playback)) {
        logger.log("[PlaybackProvider] Playback handled natively by PlatformManager.");
        return;
      }

      if (defaultPlayer === "infuse") {
        try {
          const cleanedUrl = cleanStreamUrlForExternalPlayer(playback);
          const encodedUrl = encodeURIComponent(cleanedUrl);
          const triggerUrl = `infuse://x-callback-url/play?url=${encodedUrl}`;
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = triggerUrl;
          document.body.appendChild(iframe);
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 100);
          showHUD("success", "Открываем в Infuse!");
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          showHUD("error", "Ошибка Infuse: " + errorMsg);
        }
      } else {
        setActivePlayback(playback);
      }
    },
    [defaultPlayer, showHUD],
  );

  const enrichPlayback = useCallback(
    (patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => {
      setActivePlayback((prev) => {
        if (!prev) return prev;
        if (
          match &&
          ((match.streamHash !== undefined && match.streamHash !== prev.streamHash) ||
            (match.fileIndex !== undefined && match.fileIndex !== prev.fileIndex))
        ) {
          return prev;
        }
        return { ...prev, ...patch };
      });
    },
    [],
  );

  const stopVideo = useCallback(() => {
    setActivePlayback(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivePlayback(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [potokToken]);

  const value = useMemo(
    () => ({ activePlayback, playVideo, enrichPlayback, stopVideo }),
    [activePlayback, playVideo, enrichPlayback, stopVideo],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used within PlaybackProvider");
  return context;
};
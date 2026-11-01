/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useHUD } from "./useHUD";
import { logger } from "../utils/logger";
import { PlatformManager } from "../utils/PlatformManager";
import { cleanStreamUrlForExternalPlayer } from "../utils/playbackUrl";
import { useSettings } from "./SettingsContext";
import { useAuth } from "./AuthContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { ActivePlayback, PlaybackMeta, PlaylistItem } from "./playbackTypes";
import {
  switchPlaybackSourceState,
  type PlaybackSourcePatch,
} from "../utils/playbackTransitions";

export type { ActivePlayback, PlaybackMeta, PlaylistItem } from "./playbackTypes";

export interface PlaybackContextType {
  activePlayback: ActivePlayback | null;
  playerPortalTarget: HTMLElement | null;
  registerPlayerPortalTarget: (target: HTMLElement | null) => void;
  // Enrichable metadata (subtitles/duration) lives here, NOT on activePlayback — so enrichPlayback never
  // mints a new descriptor and never tears the player down mid-playback. Consumers read it separately.
  playbackMeta: PlaybackMeta;
  playVideo: (playback: ActivePlayback) => void;
  switchPlaybackSource: (patch: PlaybackSourcePatch) => void;
  replacePlaylist: (playlist: PlaylistItem[], playlistIndex: number) => void;
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
  const [playbackMeta, setPlaybackMeta] = useState<PlaybackMeta>({});
  const [playerPortalTarget, setPlayerPortalTarget] = useState<HTMLElement | null>(null);
  const instanceCounter = useRef(0);
  // Latest descriptor, read by enrichPlayback's match guard (which writes only playbackMeta and so has no
  // access to `prev` descriptor via a functional update). Synced every render; enrich is async, so current.
  const activePlaybackRef = useRef<ActivePlayback | null>(null);
  activePlaybackRef.current = activePlayback;
  const playbackMetaRef = useRef<PlaybackMeta>({});
  playbackMetaRef.current = playbackMeta;

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
        // instanceId keys the player. A brand-new open (descriptor built fresh, no instanceId) mints one so it
        // mounts clean. An episode switch / enrich re-uses the current playback object (spreads its instanceId),
        // so we KEEP it — the player updates in place instead of remounting. Remounting every episode would
        // reset in-player state such as the remembered dub (preferredAudioRef), losing the selected voice.
        setActivePlayback({ ...playback, instanceId: playback.instanceId ?? ++instanceCounter.current });
        // Seed the enrichable metadata atom from the descriptor (fresh open OR sessionStorage restore).
        setPlaybackMeta({ subtitles: playback.subtitles, duration: playback.duration });
      }
    },
    [defaultPlayer, showHUD],
  );

  const enrichPlayback = useCallback(
    (patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => {
      // Write ONLY the enrichable atom, never the descriptor — that is what stops the mid-playback teardown.
      const cur = activePlaybackRef.current;
      if (!cur) return;
      if (
        match &&
        ((match.streamHash !== undefined && match.streamHash !== cur.streamHash) ||
          (match.fileIndex !== undefined && match.fileIndex !== cur.fileIndex))
      ) {
        return;
      }
      setPlaybackMeta((prev) => {
        const next = { ...prev };
        if (patch.subtitles !== undefined) next.subtitles = patch.subtitles;
        if (patch.duration !== undefined) next.duration = patch.duration;
        return next;
      });
    },
    [],
  );

  const replacePlaylist = useCallback((playlist: PlaylistItem[], playlistIndex: number) => {
    setActivePlayback((current) => {
      if (!current) return current;
      return { ...current, playlist, playlistIndex };
    });
  }, []);

  const switchPlaybackSource = useCallback((patch: PlaybackSourcePatch) => {
    setActivePlayback((current) => switchPlaybackSourceState(
      { activePlayback: current, playbackMeta: playbackMetaRef.current },
      patch,
    ).activePlayback);
  }, []);

  const stopVideo = useCallback(() => {
    sessionStorage.removeItem("potok_last_playback");
    setActivePlayback(null);
    setPlaybackMeta({});
  }, []);

  const registerPlayerPortalTarget = useCallback((target: HTMLElement | null) => {
    setPlayerPortalTarget(target);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActivePlayback(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [potokToken]);

  // Playlist navigation that bypasses plugin code (player "next"/prev/auto-advance, host panel clicks)
  // still moves the active episode. Plugins with their own episode panel (online-balancers) track the
  // selection in plugin state, so broadcast the change — each plugin decides whether it applies.
  useEffect(() => {
    if (!activePlayback?.playlist?.length || activePlayback.playlistIndex === undefined) return;
    const item = activePlayback.playlist[activePlayback.playlistIndex];
    if (!item) return;
    ExtensionRegistry.broadcast("PLAYLIST_ITEM_CHANGED", {
      episodeId: item.id ?? null,
      season: item.season ?? null,
      episode: item.episode ?? null,
      playlistIndex: activePlayback.playlistIndex,
      title: item.title ?? null,
    });
  }, [activePlayback]);

  // Playback lifecycle events for plugin UIs: opened / closed. Plugins never see these transitions
  // otherwise — plugin-initiated playVideo goes through the sandbox bridge, but host-side closes
  // (close button, back button, fatal errors, session reset) never reach plugin code.
  const hadPlaybackRef = useRef(false);
  const lastPlaybackRef = useRef<ActivePlayback | null>(null);
  useEffect(() => {
    const hasPlayback = Boolean(activePlayback);
    if (hasPlayback && !hadPlaybackRef.current) {
      ExtensionRegistry.broadcast("PLAYBACK_STARTED", {
        title: activePlayback?.title ?? null,
        mediaType: activePlayback?.mediaType ?? null,
        season: activePlayback?.season ?? null,
        episode: activePlayback?.episode ?? null,
        providerId: activePlayback?.providerId ?? null,
      });
    } else if (!hasPlayback && hadPlaybackRef.current) {
      ExtensionRegistry.broadcast("PLAYBACK_STOPPED", {
        title: lastPlaybackRef.current?.title ?? null,
        mediaType: lastPlaybackRef.current?.mediaType ?? null,
        providerId: lastPlaybackRef.current?.providerId ?? null,
      });
    }
    hadPlaybackRef.current = hasPlayback;
    if (activePlayback) lastPlaybackRef.current = activePlayback;
  }, [activePlayback]);

  const value = useMemo(
    () => ({
      activePlayback,
      playbackMeta,
      playerPortalTarget,
      registerPlayerPortalTarget,
      playVideo,
      switchPlaybackSource,
      replacePlaylist,
      enrichPlayback,
      stopVideo,
    }),
    [
      activePlayback,
      playbackMeta,
      playerPortalTarget,
      registerPlayerPortalTarget,
      playVideo,
      switchPlaybackSource,
      replacePlaylist,
      enrichPlayback,
      stopVideo,
    ],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used within PlaybackProvider");
  return context;
};

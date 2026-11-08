import { useCallback, useEffect, useRef } from "react";
import type { ActivePlayback } from "../context/AppSettingsContext";
import { getCurrentPlaylistItem } from "../context/playbackTypes";

interface UsePlayerBackendSessionParams {
  playback: ActivePlayback;
  streamHash: string;
  fileIndex: string;
  onBeforeClose?: () => void;
}

/**
 * Backend session keepalive/stop for the CURRENT playlist item's session (R3 — the session
 * rides the item, not the descriptor). Statistics and session hygiene only; never content.
 */
export function usePlayerBackendSession({
  playback,
  streamHash,
  fileIndex,
  onBeforeClose,
}: UsePlayerBackendSessionParams) {
  const playSessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  );
  const session = getCurrentPlaylistItem(playback)?.session;

  const stopBackendSession = useCallback(() => {
    const stopUrl = session?.stopUrl;
    if (!stopUrl) return;
    try {
      const sep = stopUrl.includes("?") ? "&" : "?";
      navigator.sendBeacon(
        `${stopUrl}${sep}sessionId=${encodeURIComponent(playSessionIdRef.current)}`,
      );
    } catch {
      /* noop */
    }
  }, [session?.stopUrl]);

  const closePlayer = useCallback(() => {
    onBeforeClose?.();
    stopBackendSession();
  }, [onBeforeClose, stopBackendSession]);

  useEffect(() => {
    window.addEventListener("pagehide", stopBackendSession);
    return () => window.removeEventListener("pagehide", stopBackendSession);
  }, [stopBackendSession]);

  const sendKeepalive = useCallback(() => {
    if (!session?.keepaliveUrl) return;
    fetch(session.keepaliveUrl, {
      method: "POST",
      body: JSON.stringify({
        sessionId: playSessionIdRef.current,
        hash: (session.hash || streamHash || "").toLowerCase(),
        file: session.file || fileIndex,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [session, streamHash, fileIndex]);

  useEffect(() => {
    if (!session?.keepaliveUrl) return;
    sendKeepalive();
    const ms = (session.intervalSec || 7) * 1000;
    const id = setInterval(sendKeepalive, ms);
    return () => clearInterval(id);
  }, [sendKeepalive, session?.keepaliveUrl, session?.intervalSec]);

  return { closePlayer, stopBackendSession };
}
import { useCallback, useEffect, useRef } from "react";
import type { ActivePlayback } from "../context/AppSettingsContext";

interface UsePlayerBackendSessionParams {
  playback: ActivePlayback;
  streamHash: string;
  fileIndex: string;
  onBeforeClose?: () => void;
}

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

  const stopBackendSession = useCallback(() => {
    const stopUrl = playback.session?.stopUrl;
    if (!stopUrl) return;
    try {
      const sep = stopUrl.includes("?") ? "&" : "?";
      navigator.sendBeacon(
        `${stopUrl}${sep}sessionId=${encodeURIComponent(playSessionIdRef.current)}`,
      );
    } catch {
      /* noop */
    }
  }, [playback.session?.stopUrl]);

  const closePlayer = useCallback(() => {
    onBeforeClose?.();
    stopBackendSession();
  }, [onBeforeClose, stopBackendSession]);

  useEffect(() => {
    window.addEventListener("pagehide", stopBackendSession);
    return () => window.removeEventListener("pagehide", stopBackendSession);
  }, [stopBackendSession]);

  const sendKeepalive = useCallback(() => {
    const session = playback.session;
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
  }, [playback.session, streamHash, fileIndex]);

  useEffect(() => {
    if (!playback.session?.keepaliveUrl) return;
    sendKeepalive();
    const ms = (playback.session.intervalSec || 7) * 1000;
    const id = setInterval(sendKeepalive, ms);
    return () => clearInterval(id);
  }, [sendKeepalive, playback.session?.keepaliveUrl, playback.session?.intervalSec]);

  return { closePlayer, stopBackendSession };
}
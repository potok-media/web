import { useState, useEffect } from "react";
import type { SDKPlaybackSession } from "../sdk/src/types";
import { logger } from "../utils/logger";

// Generic warm-up/buffering status poller. The plugin (which knows its backend) supplies
// `session.statusUrl`; the player polls it and reads the provider-neutral SDKPlaybackStatus shape
// (`connected`, `bytesPerSec`). Legacy torrent-shaped fields (`peers`, `downloadSpeed`) are accepted as
// fallbacks so no backend change is required. The player never constructs a backend URL or knows the
// backend kind — keeps it provider-agnostic. Omitted statusUrl → no polling (instant/CDN sources).
export function usePlaybackStatus(session: SDKPlaybackSession | undefined, isActive: boolean) {
  const [connected, setConnected] = useState<number | null>(null);
  const [bytesPerSec, setBytesPerSec] = useState<number | null>(null);
  const [hasProgressSince, setHasProgressSince] = useState<number | null>(null);

  const statusUrl = session?.statusUrl;
  const activeMs = (session?.statusIntervalSec && session.statusIntervalSec > 0)
    ? session.statusIntervalSec * 1000
    : 2000;

  useEffect(() => {
    if (!statusUrl) {
      setConnected(null);
      setBytesPerSec(null);
      setHasProgressSince(null);
      return;
    }

    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(statusUrl, { mode: "cors" });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        // Generic fields first, then legacy torrent-shaped fallbacks (zero backend change).
        const conn = typeof data.connected === "number" ? data.connected
          : typeof data.peers === "number" ? data.peers : 0;
        const bps = typeof data.bytesPerSec === "number" ? data.bytesPerSec
          : typeof data.downloadSpeed === "number" ? data.downloadSpeed : 0;

        setConnected(conn);
        setBytesPerSec(bps);
        setHasProgressSince((prev) => (conn > 0 ? (prev ?? Date.now()) : null));
      } catch (err) {
        logger.warn("[WebMediaPlayer] Playback status poll failed:", err);
      }
    };

    poll(); // immediate
    const interval = setInterval(poll, isActive ? activeMs : 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [statusUrl, isActive, activeMs]);

  return { connected, bytesPerSec, hasProgressSince };
}

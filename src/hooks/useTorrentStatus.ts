import { useState, useEffect } from "react";
import { ApiClient } from "../network/ApiClient";
import { logger } from "../utils/logger";

export function useTorrentStatus(streamHash: string, isMetadataLoading: boolean) {
  const [torrentPeers, setTorrentPeers] = useState<number | null>(null);
  const [torrentDownloadSpeed, setTorrentDownloadSpeed] = useState<number | null>(null);
  const [hasPositivePeersTime, setHasPositivePeersTime] = useState<number | null>(null);

  useEffect(() => {
    if (!streamHash) {
      setTorrentPeers(null);
      setTorrentDownloadSpeed(null);
      setHasPositivePeersTime(null);
      return;
    }

    const hash = streamHash.toLowerCase();
    const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
    const statusUrl = `${cleanBase}/api/torrents/${hash}`;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        const res = await fetch(statusUrl, { mode: "cors" });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const peersCount = typeof data.peers === "number" ? data.peers : 0;
        const speed = typeof data.downloadSpeed === "number" ? data.downloadSpeed : 0;

        setTorrentPeers(peersCount);
        setTorrentDownloadSpeed(speed);

        if (peersCount > 0) {
          setHasPositivePeersTime((prev) => prev ?? Date.now());
        } else {
          setHasPositivePeersTime(null);
        }
      } catch (err) {
        logger.warn("[WebMediaPlayer] Torrent status poll failed:", err);
      }
    };

    pollStatus(); // Poll immediately
    const pollInterval = isMetadataLoading ? 2000 : 10000;
    const interval = setInterval(pollStatus, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [streamHash, isMetadataLoading]);

  return { torrentPeers, torrentDownloadSpeed, hasPositivePeersTime };
}

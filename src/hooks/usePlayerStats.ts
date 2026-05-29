import { useEffect, useState } from "react";
import type React from "react";
import type Artplayer from "artplayer";
import type Hls from "hls.js";
import { ApiClient } from "../network/ApiClient";

type SafeArtplayer = Artplayer & { hls?: Hls; };

interface HTMLVideoElementWithQuality extends Omit<HTMLVideoElement, 'getVideoPlaybackQuality'> {
  getVideoPlaybackQuality?: () => {
    totalVideoFrames: number;
    droppedVideoFrames: number;
    corruptedVideoFrames?: number;
  };
}

export function usePlayerStats(
  artRef: React.RefObject<Artplayer | null>,
  isPlaying: boolean,
  showStats: boolean,
  streamUrl: string,
  torrentHash: string,
  duration: number
) {
  const [downloadSpeed, setDownloadSpeed] = useState("0.0");
  const [bitrate, setBitrate] = useState("0.0");
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState(24);

  // 1. One-time Content-Length HEAD request to calculate precise progressive video bitrate
  useEffect(() => {
    if (duration <= 0 || !streamUrl || streamUrl.includes(".m3u8") || !showStats) return;

    let isMounted = true;
    fetch(streamUrl, { method: "HEAD" })
      .then((res) => {
        const size = res.headers.get("content-length");
        if (isMounted && size) {
          const sizeBytes = parseInt(size, 10);
          if (!isNaN(sizeBytes) && sizeBytes > 0) {
            const calculatedBitrate = (sizeBytes * 8) / (duration * 1000 * 1000);
            setBitrate(calculatedBitrate.toFixed(1));
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch stream file size for bitrate:", err));

    return () => {
      isMounted = false;
    };
  }, [streamUrl, duration, showStats]);

  // 2. Real-time network and quality polling interval
  useEffect(() => {
    const art = artRef.current;
    if (!art || !showStats) return;

    const statsInterval = setInterval(() => {
      if (!art.playing) return;

      const hls = (art as SafeArtplayer).hls;
      if (hls) {
        // Hls.js bandwidth estimation (bits/sec -> MB/s)
        setDownloadSpeed((hls.bandwidthEstimate / 8 / 1024 / 1024).toFixed(1));
        const lvl = hls.levels?.[hls.currentLevel];
        if (lvl) {
          setBitrate((lvl.bitrate / 1000 / 1000).toFixed(1));
          setResolution(`${lvl.width}x${lvl.height}`);
        }
      } else if (torrentHash) {
        // TorrentGo direct download speed (Bytes/sec -> MB/s)
        const cleanBase = ApiClient.torrentGoURL.replace(/\/+$/, "");
        fetch(`${cleanBase}/api/torrent/status/${torrentHash.toLowerCase()}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && typeof data.downloadSpeed === "number") {
              setDownloadSpeed((data.downloadSpeed / 1024 / 1024).toFixed(1));
            }
          })
          .catch(() => {});
      }

      // Native frame rate observer
      const video = art.video as HTMLVideoElementWithQuality | undefined;
      if (video && video.getVideoPlaybackQuality) {
        const q = video.getVideoPlaybackQuality();
        if (q && q.totalVideoFrames) {
          setFps(q.corruptedVideoFrames ? 23 : 24);
        }
      }
    }, 1000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [artRef, isPlaying, showStats, torrentHash]);

  return { downloadSpeed, bitrate, resolution, fps };
}

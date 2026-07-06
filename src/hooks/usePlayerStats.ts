import { useEffect, useState } from "react";
import type React from "react";
import type Hls from "hls.js";
import { ApiClient } from "../network/ApiClient";
import { logger } from "../utils/logger";

interface HTMLVideoElementWithQuality extends Omit<HTMLVideoElement, 'getVideoPlaybackQuality'> {
  getVideoPlaybackQuality?: () => {
    totalVideoFrames: number;
    droppedVideoFrames: number;
    corruptedVideoFrames?: number;
  };
}

export function usePlayerStats(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  hlsRef: React.RefObject<Hls | null>,
  isPlaying: boolean,
  showStats: boolean,
  streamUrl: string,
  statusUrl: string,
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
    
    // Bypass CORS for progressive video metadata HEAD request via our local BFF proxy
    const proxyBase = ApiClient.baseURL.replace(/\/+$/, "");
    const proxiedUrl = `${proxyBase}/api/proxy?url=${encodeURIComponent(streamUrl)}`;

    fetch(proxiedUrl, { method: "HEAD" })
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
      .catch((err) => logger.warn("Failed to fetch stream file size for bitrate:", err));

    return () => {
      isMounted = false;
    };
  }, [streamUrl, duration, showStats]);

  // 2. Real-time network and quality polling interval
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showStats) return;

    const statsInterval = setInterval(() => {
      if (videoRef.current !== video) return;
      if (video.paused) return;

      const hls = hlsRef.current;
      if (hls) {
        // Hls.js bandwidth estimation (bits/sec -> MB/s)
        setDownloadSpeed((hls.bandwidthEstimate / 8 / 1024 / 1024).toFixed(1));
        const lvl = hls.levels?.[hls.currentLevel];
        if (lvl) {
          setBitrate((lvl.bitrate / 1000 / 1000).toFixed(1));
          setResolution(`${lvl.width}x${lvl.height}`);
        }
      } else if (statusUrl) {
        // Direct/progressive throughput via the plugin-supplied GENERIC status endpoint (no backend URL
        // knowledge here). Reads the neutral `bytesPerSec`, falling back to legacy `downloadSpeed`.
        fetch(statusUrl, { mode: "cors" })
          .then((res) => res.json())
          .then((data) => {
            const bps = typeof data.bytesPerSec === "number" ? data.bytesPerSec
              : typeof data.downloadSpeed === "number" ? data.downloadSpeed : null;
            if (bps !== null) {
              setDownloadSpeed((bps / 1024 / 1024).toFixed(1));
            }
          })
          .catch(() => {});
      }

      // Native frame rate observer
      const videoEl = video as HTMLVideoElementWithQuality | undefined;
      if (videoEl && videoEl.getVideoPlaybackQuality) {
        const q = videoEl.getVideoPlaybackQuality();
        if (q && q.totalVideoFrames) {
          setFps(q.corruptedVideoFrames ? 23 : 24);
        }
      }
    }, 1000);

    return () => {
      clearInterval(statsInterval);
    };
  }, [videoRef, hlsRef, isPlaying, showStats, statusUrl]);

  return { downloadSpeed, bitrate, resolution, fps };
}

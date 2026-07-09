import type Hls from "hls.js";

/** Build hls.js config tuned for VOD torrent streams (cold playlist/frag loads). */
export function createHlsPlayerConfig(startPos: number): Partial<Hls["config"]> {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    maxBufferLength: 30,
    maxMaxBufferLength: 120,
    backBufferLength: 30,
    maxBufferHole: 0.5,
    stretchShortVideoTrack: true,
    fragLoadingTimeOut: 60000,
    playlistLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: 60000,
        maxLoadTimeMs: 60000,
        timeoutRetry: { maxNumRetry: 2, retryDelayMs: 0, maxRetryDelayMs: 0 },
        errorRetry: { maxNumRetry: 2, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
      },
    },
    manifestLoadPolicy: {
      default: {
        maxTimeToFirstByteMs: Infinity,
        maxLoadTimeMs: 60000,
        timeoutRetry: { maxNumRetry: 2, retryDelayMs: 0, maxRetryDelayMs: 0 },
        errorRetry: { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 8000 },
      },
    },
    nudgeMaxRetry: 8,
    startPosition: startPos > 0 ? startPos : -1,
  };
}
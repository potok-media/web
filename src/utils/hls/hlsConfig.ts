import type Hls from "hls.js";

/**
 * Build hls.js config tuned for VOD torrent streams (cold playlist/frag loads).
 *
 * `streamHeaders` come from the resolving backend (online-balancers) and must be replayed on
 * every manifest/segment request — balancers gate access by them and a missing header fails
 * as a CORS/error at the CDN. Headers the browser forbids (Referer, User-Agent, …) are
 * skipped per-request; hls.js falls back to plain XHR defaults for those.
 */
export function createHlsPlayerConfig(
  startPos: number,
  streamHeaders?: Record<string, string>,
): Partial<Hls["config"]> {
  const safeHeaders = streamHeaders
    ? Object.entries(streamHeaders).filter(
        ([name, value]) => Boolean(name?.trim()) && typeof value === "string",
      )
    : [];
  return {
    enableWorker: true,
    lowLatencyMode: false,
    maxBufferLength: 30,
    maxMaxBufferLength: 120,
    backBufferLength: 30,
    maxBufferHole: 0.5,
    stretchShortVideoTrack: true,
    fragLoadingTimeOut: 60000,
    ...(safeHeaders.length
      ? {
          xhrSetup: (xhr: XMLHttpRequest) => {
            for (const [name, value] of safeHeaders) {
              try {
                xhr.setRequestHeader(name, value);
              } catch {
                // Forbidden header names (Referer, User-Agent, …) throw in browsers — skip them.
              }
            }
          },
        }
      : {}),
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
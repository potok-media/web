// TorrentGo stream provider — the single home for TorrentGo-specific stream logic that used
// to be scattered across WebMediaPlayer, useHlsPlayer and usePlayerMetadataAndTracks:
// identifying a TorrentGo stream, extracting its hash/file index, deciding when a remux is
// required, building remux/subtitle URLs, and resolving the exact keyframe for a seek.
//
// The player and TorrentGo are "native" to each other, so this module is deliberately coupled
// to TorrentGo's URL scheme and remux protocol rather than being a generic provider interface.
import { ApiClient } from "../network/ApiClient";
import { getFileExtension, normalizeStreamUrlToPath, updateStreamUrlParams } from "./playerHelpers";

// Container/extensions the browser can play directly, without a server-side remux.
export const NATIVE_MEDIA_EXTS = ["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd", "m4v"];

export interface TorrentGoRef {
  hash: string; // lowercase 40-hex info hash, or "" if not a TorrentGo stream
  fileIndex: string; // numeric file index string, or ""
}

export interface StreamInfo {
  normalizedUrl: string;
  isTorrentGoStream: boolean;
  ext: string;
  isNonNative: boolean;
}

/**
 * Extract the torrent info-hash and file index from a TorrentGo stream URL, supporting both the
 * path form (/stream/<hash>/<index> or /torrents/<hash>/files/<index>) and the query form
 * (?link=<hash>&index=<n>). `explicitHash` (e.g. playback.streamHash) takes precedence.
 */
export function parseTorrentGoRef(streamUrl: string, explicitHash?: string): TorrentGoRef {
  let hash = explicitHash || "";
  if (!hash) {
    const hashMatch = streamUrl.match(/\/(?:stream|torrents)\/([a-f0-9]{40})/i);
    if (hashMatch) {
      hash = hashMatch[1];
    } else {
      try {
        hash = new URL(streamUrl).searchParams.get("link") || "";
      } catch {
        const m = streamUrl.match(/[?&]link=([a-f0-9]{40})/i);
        if (m) hash = m[1];
      }
    }
  }

  let fileIndex = "";
  const pathMatch = streamUrl.match(/\/(?:stream|torrents)\/[a-f0-9]+(?:\/files)?\/(\d+)/i);
  if (pathMatch) {
    fileIndex = pathMatch[1];
  } else {
    try {
      fileIndex = new URL(streamUrl).searchParams.get("index") || "";
    } catch {
      const m = streamUrl.match(/[?&]index=(\d+)/i);
      if (m) fileIndex = m[1];
    }
  }

  return { hash: hash ? hash.toLowerCase() : "", fileIndex };
}

/** Normalize the URL and classify it (TorrentGo stream? native codec?) in one pass. */
export function describeStream(
  streamUrl: string,
  opts?: { streamHash?: string; torrentHash?: string }
): StreamInfo {
  const normalizedUrl = normalizeStreamUrlToPath(streamUrl);
  const isTorrentGoStream =
    normalizedUrl.includes("/stream/") ||
    normalizedUrl.includes("/torrents/") ||
    !!(opts?.streamHash || opts?.torrentHash);
  const ext = getFileExtension(normalizedUrl);
  const isNonNative = ext ? !NATIVE_MEDIA_EXTS.includes(ext) : false;
  return { normalizedUrl, isTorrentGoStream, ext, isNonNative };
}

/**
 * Whether playback of this stream must go through a server-side remux (non-native codec,
 * a non-default audio track, or an explicit remux=true flag).
 */
export function streamNeedsRemux(info: StreamInfo, rawStreamUrl: string, audioTrackId: number): boolean {
  return (
    info.isTorrentGoStream &&
    (info.isNonNative ||
      audioTrackId > 0 ||
      rawStreamUrl.includes("remux=true") ||
      info.normalizedUrl.includes("remux=true"))
  );
}

/** Build a remuxing stream URL (remux=true&start=<sec>&audio=<n>) from a normalized stream URL. */
export function buildRemuxUrl(normalizedUrl: string, startSeconds: number, audioTrackId: number): string {
  return updateStreamUrlParams(normalizedUrl, {
    remux: "true",
    start: startSeconds.toFixed(3),
    audio: audioTrackId !== -1 ? audioTrackId.toString() : "0",
  });
}

/** Strip remux/start/audio params to get the plain (non-remux) stream URL. */
export function stripRemuxParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("remux");
    parsed.searchParams.delete("start");
    parsed.searchParams.delete("audio");
    return parsed.toString();
  } catch {
    return url.split("?")[0];
  }
}

/** Build the URL of an embedded subtitle track extracted by TorrentGo. */
export function buildSubtitleSrc(hash: string, fileIndex: string | number, relIndex: number): string {
  const cleanBase = ApiClient.playerServerURL.replace(/\/+$/, "");
  return `${cleanBase}/stream/${hash.toLowerCase()}/${fileIndex}/subtitles/${relIndex}`;
}

/**
 * Resolve the exact keyframe the remux will start on for a requested seek time, so the client's
 * seekOffset equals the real output start (ffmpeg -ss input seeking snaps to the preceding
 * keyframe). Falls back to the requested time when the lookup is unavailable, so seeking is
 * never blocked.
 */
export async function resolveRemuxStart(hash: string, fileIndex: string, requestedTime: number): Promise<number> {
  if (hash && fileIndex) {
    const resolved = await ApiClient.getNearestKeyframe(hash, fileIndex, requestedTime);
    if (resolved !== null && resolved >= 0) return resolved;
  }
  return requestedTime;
}

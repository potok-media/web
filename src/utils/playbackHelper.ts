import { ApiClient } from "../network/ApiClient";

/**
 * Detects if the current device is running iOS or iPadOS (iPhone/iPad/iPod).
 */
export const isIOS = (): boolean => {
  if (typeof window === "undefined" || !navigator) return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Determines if the current client platform should bypass our custom WebMediaPlayer
 * and utilize the platform's native media player directly.
 */
export const shouldBypassWebPlayer = (): boolean => {
  // Currently we bypass for iOS/iPadOS devices.
  // In the future this can be expanded to Android, smart TVs (Tizen/WebOS), etc.
  return isIOS();
};

/**
 * Checks if a stream URL requires server-side remuxing (e.g., non-native container formats like MKV).
 */
export const checkRequiresRemux = (streamUrl: string, torrentHash?: string, streamHash?: string): boolean => {
  if (!streamUrl) return false;
  const isStreamServer = streamUrl.includes("/stream/") || !!torrentHash || !!streamHash;
  if (!isStreamServer) return false;

  try {
    const cleanUrl = streamUrl.split("?")[0].split("#")[0];
    const ext = cleanUrl.slice(cleanUrl.lastIndexOf(".") + 1).toLowerCase();
    if (ext && !["mp4", "m3u8", "webm", "ogg", "mp3", "wav", "m4a", "mpd"].includes(ext)) {
      return true;
    }
  } catch {}
  return false;
};

/**
 * Formats a stream URL into a fully-qualified absolute URL with appropriate remux parameters
 * for native system media players.
 */
export const formatNativePlaybackUrl = (
  streamUrl: string,
  torrentHash?: string,
  streamHash?: string
): string => {
  let formattedUrl = streamUrl || "";

  // Append remux parameter if the format is non-native on a streaming server
  if (checkRequiresRemux(formattedUrl, torrentHash, streamHash)) {
    try {
      const urlObj = new URL(formattedUrl);
      urlObj.searchParams.set("remux", "true");
      formattedUrl = urlObj.toString();
    } catch {
      const separator = formattedUrl.includes("?") ? "&" : "?";
      formattedUrl = `${formattedUrl}${separator}remux=true`;
    }
  }

  // Resolve relative URLs to absolute URLs
  if (formattedUrl.startsWith("/")) {
    if (formattedUrl.startsWith("/api/")) {
      const base = ApiClient.baseURL.replace(/\/+$/, "");
      formattedUrl = `${base}${formattedUrl}`;
    } else {
      const base = typeof window !== "undefined" ? window.location.origin.replace(/\/+$/, "") : "";
      const path = formattedUrl.startsWith("/") ? formattedUrl : `/${formattedUrl}`;
      formattedUrl = `${base}${path}`;
    }
  }

  return formattedUrl;
};

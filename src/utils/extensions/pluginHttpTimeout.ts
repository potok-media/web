export const DEFAULT_PLUGIN_HTTP_TIMEOUT_MS = 15_000;
export const TORRENT_SEARCH_HTTP_TIMEOUT_MS = 90_000;
export const MAX_PLUGIN_HTTP_TIMEOUT_MS = 120_000;

export function resolvePluginHttpTimeout(url: string, timeoutMs?: number): number {
  if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return Math.min(Math.floor(timeoutMs), MAX_PLUGIN_HTTP_TIMEOUT_MS);
  }
  if (url.includes("/api/v1/torrents/search") || isTorrentGoAddUrl(url)) {
    return TORRENT_SEARCH_HTTP_TIMEOUT_MS;
  }
  return DEFAULT_PLUGIN_HTTP_TIMEOUT_MS;
}

function isTorrentGoAddUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    return path === "/api/torrents";
  } catch {
    return /\/api\/torrents\/?$/.test(url);
  }
}

export function formatSearchCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

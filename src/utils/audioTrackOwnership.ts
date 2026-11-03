export interface ExternalAudioSource {
  name: string;
  url: string;
}

function stripAudioSelector(url: string): string {
  try {
    const parsed = new URL(url, "https://potok.local");
    parsed.searchParams.delete("audio");
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.replace(/([?&])audio=[^&]*&?/i, "$1").replace(/[?&]$/, "");
  }
}

/**
 * True when `url` addresses the same stream as `currentStreamUrl` once the `?audio=` voice selector
 * is removed. Online-balancers bake the voice into the resolved stream and ignore the selector —
 * entries that differ ONLY in it cannot be switched to by a plain url swap and need a plugin
 * re-resolve, while genuinely different base urls are distinct playable streams.
 */
export function isSameBaseStreamUrl(url: string, currentStreamUrl: string): boolean {
  return stripAudioSelector(url) === stripAudioSelector(currentStreamUrl);
}

export function resolveExternalAudioIndex(
  audios: ExternalAudioSource[],
  streamUrl: string,
): number {
  const exactIndex = audios.findIndex((audio) => audio.url === streamUrl);
  if (exactIndex >= 0) return exactIndex;

  let rawIndex: string | null;
  try {
    rawIndex = new URL(streamUrl, "https://potok.local").searchParams.get("audio");
  } catch {
    rawIndex = streamUrl.match(/[?&]audio=(\d+)/i)?.[1] ?? null;
  }

  if (rawIndex !== null) {
    const parsed = Number.parseInt(rawIndex, 10);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed < audios.length) return parsed;
  }

  return 0;
}

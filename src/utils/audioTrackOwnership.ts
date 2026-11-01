export interface ExternalAudioSource {
  name: string;
  url: string;
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

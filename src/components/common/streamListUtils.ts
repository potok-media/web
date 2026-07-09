import type { RawStreamPayload } from "@potok/sdk-types";

/** Torrent plugin payloads may include legacy field names beyond RawStreamPayload. */
export type ExtendedStreamPayload = RawStreamPayload & {
  tracker?: string;
  seeders?: number;
  leechers?: number;
  sizeBytes?: number;
  publishDate?: string;
  seasons?: number[];
  season?: number | null;
};

export function getStreamProvider(stream: ExtendedStreamPayload): string {
  return stream.provider || stream.tracker || "";
}

export function getStreamSeeders(stream: ExtendedStreamPayload): number {
  return stream.seeds !== undefined ? stream.seeds : stream.seeders ?? 0;
}

export function getStreamSizeBytes(stream: ExtendedStreamPayload): number {
  return typeof stream.size === "number" ? stream.size : stream.sizeBytes ?? 0;
}

export function matchesSeasonFilter(stream: ExtendedStreamPayload, seasonFilter: string): boolean {
  if (seasonFilter === "all") return true;
  if (stream.seasons?.includes(Number(seasonFilter))) return true;
  if (stream.season === Number(seasonFilter)) return true;
  if (
    seasonFilter === "none" &&
    !stream.seasons &&
    (stream.season === undefined || stream.season === null || stream.season === 0)
  ) {
    return true;
  }
  return false;
}

export function collectSeasonNumbers(streams: ExtendedStreamPayload[]): number[] {
  const set = new Set<number>();
  streams.forEach((s) => {
    if (s.seasons) {
      s.seasons.forEach((num) => set.add(num));
    } else if (s.season !== undefined && s.season !== null && s.season !== 0) {
      set.add(s.season);
    }
  });
  return Array.from(set).sort((a, b) => a - b);
}
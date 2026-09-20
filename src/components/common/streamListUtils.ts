import type { RawStreamPayload } from "@potok/sdk-types";
import type { StreamUIItem } from "../../network/ApiTypes";
import { formatOverrideBadge, type StreamOverrideSummary } from "./streamOverrideBadge";

export type { StreamOverrideSummary };

/** Torrent plugin payloads may include legacy field names beyond RawStreamPayload. */
export type ExtendedStreamPayload = RawStreamPayload & {
  tracker?: string;
  seeders?: number;
  leechers?: number;
  sizeBytes?: number;
  publishDate?: string;
  seasons?: number[];
  season?: number | null;
  override?: StreamOverrideSummary;
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Empty vs skeleton vs rows while a live search is still running. */
export function streamListViewFlags(
  loading: boolean,
  isSearching: boolean,
  itemCount: number,
): { inFlight: boolean; showSkeletons: boolean; showEmpty: boolean } {
  const inFlight = loading || isSearching;
  return {
    inFlight,
    showSkeletons: inFlight && itemCount === 0,
    showEmpty: !inFlight && itemCount === 0,
  };
}

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

export function getStreamHash(stream: ExtendedStreamPayload): string {
  return (stream.hash || "").trim().toLowerCase();
}

export function findStreamByIdentity(
  streams: ExtendedStreamPayload[],
  target: ExtendedStreamPayload,
): ExtendedStreamPayload | undefined {
  const hash = getStreamHash(target);
  if (hash) return streams.find((s) => getStreamHash(s) === hash);
  if (target.magnet) {
    const byMagnet = streams.find((s) => s.magnet && s.magnet === target.magnet);
    if (byMagnet) return byMagnet;
  }
  if (target.url) return streams.find((s) => s.url && s.url === target.url);
  return undefined;
}

export function isSameStream(a: ExtendedStreamPayload, b: ExtendedStreamPayload): boolean {
  const ha = getStreamHash(a);
  const hb = getStreamHash(b);
  if (ha && hb) return ha === hb;
  if (a.magnet && b.magnet) return a.magnet === b.magnet;
  if (a.url && b.url) return a.url === b.url;
  return false;
}

export function mergePinStream(
  stored: ExtendedStreamPayload,
  live?: ExtendedStreamPayload,
): ExtendedStreamPayload {
  if (!live) return stored;
  return { ...stored, ...live, override: live.override ?? stored.override };
}

export function mapStreamToUI(
  stream: ExtendedStreamPayload,
  index: number,
  t: TranslateFn,
  extras?: Pick<StreamUIItem, "isLastSelected" | "missingFromResults">,
): StreamUIItem {
  const voiceTags = stream.voice
    ? stream.voice
        .split(/[,;]+/)
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const vLower = v.toLowerCase();
          let emoji = "🎙️";
          if (vLower.includes("original") || vLower.includes("japan") || vLower.includes("eng")) {
            emoji = vLower.includes("sub") || vLower.includes("суб") ? "💬" : "🌐";
          } else if (vLower.includes("sub") || vLower.includes("суб")) {
            emoji = "💬";
          }
          return { kind: "voice", value: `${emoji} ${v}` };
        })
    : [];

  const seeds = stream.seeds !== undefined ? stream.seeds : stream.seeders;
  const peers = stream.peers !== undefined ? stream.peers : stream.leechers;
  const provider = stream.provider || stream.tracker || t("source");
  const sizeBytes = typeof stream.size === "number" ? stream.size : stream.sizeBytes;

  return {
    id: stream.url || stream.magnet || stream.hash || `${stream.title}-${index}`,
    title: stream.title || String(t("source")),
    sizeLabel: stream.quality ? stream.quality.toUpperCase() : "",
    sizeBytes,
    tracker: provider,
    seeders: seeds,
    leechers: peers,
    publishDate: stream.publishDate,
    tags: [
      ...(stream.kind && stream.kind !== "torrent"
        ? [{ kind: "kind", value: `⚡ ${(stream.kind === "hls" || stream.kind === "m3u8") ? "M3U8" : stream.kind.toUpperCase()}` }]
        : []),
      ...voiceTags,
    ],
    overrideBadge: formatOverrideBadge(stream.override, t),
    isLastSelected: extras?.isLastSelected,
    missingFromResults: extras?.missingFromResults,
  };
}
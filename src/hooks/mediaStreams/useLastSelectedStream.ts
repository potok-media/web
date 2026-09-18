import { useCallback, useEffect, useState } from "react";
import type { RawStreamPayload } from "@potok/sdk-types";
import type { ExtendedStreamPayload } from "../../components/common/streamListUtils";
import type { StreamOverrideSummary } from "../../components/common/streamOverrideBadge";
import { Storage } from "../../utils/StorageService";

/** Pin the release only after it has been launched more than twice. */
export const LAST_STREAM_PIN_AFTER_PLAYS = 3;

export function lastSelectedStreamKey(mediaType: string, mediaId: number | string): string {
  return `potok_last_stream:${mediaType}:${mediaId}`;
}

export function streamPlayIdentity(stream: RawStreamPayload): string {
  const s = stream as ExtendedStreamPayload;
  const hash = (s.hash || "").trim().toLowerCase();
  if (hash) return `hash:${hash}`;
  if (s.magnet) return `magnet:${s.magnet}`;
  if (s.url) return `url:${s.url}`;
  return `title:${s.title || ""}`;
}

export type LastStreamCandidate = {
  stream: ExtendedStreamPayload;
  playCount: number;
  lastPlayedAt: number;
};

export type LastStreamLedger = {
  byId: Record<string, LastStreamCandidate>;
  pinnedId: string | null;
};

function snapshotStream(stream: RawStreamPayload): ExtendedStreamPayload {
  const s = stream as ExtendedStreamPayload;
  return {
    title: s.title,
    url: s.url,
    magnet: s.magnet,
    hash: s.hash,
    tracker: s.tracker,
    provider: s.provider,
    size: s.size,
    sizeBytes: s.sizeBytes,
    seeders: s.seeders,
    seeds: s.seeds,
    leechers: s.leechers,
    peers: s.peers,
    kind: s.kind,
    quality: s.quality,
    voice: s.voice,
    override: s.override,
    seasons: s.seasons,
    season: s.season,
    publishDate: s.publishDate,
  };
}

function isLedger(value: unknown): value is LastStreamLedger {
  return !!value && typeof value === "object" && "byId" in value && typeof (value as LastStreamLedger).byId === "object";
}

export function loadLastStreamLedger(
  mediaType?: string,
  mediaId?: number,
): LastStreamLedger {
  if (!mediaType || !mediaId) return { byId: {}, pinnedId: null };
  const value = Storage.get<unknown>(lastSelectedStreamKey(mediaType, mediaId), null);
  if (isLedger(value)) {
    return {
      byId: value.byId ?? {},
      pinnedId: value.pinnedId ?? null,
    };
  }
  return { byId: {}, pinnedId: null };
}

function pinnedFromLedger(ledger: LastStreamLedger): ExtendedStreamPayload | null {
  if (!ledger.pinnedId) return null;
  const candidate = ledger.byId[ledger.pinnedId];
  if (!candidate || candidate.playCount < LAST_STREAM_PIN_AFTER_PLAYS) return null;
  if (!candidate.stream || typeof candidate.stream.title !== "string") return null;
  return candidate.stream;
}

export function readLastSelectedStream(
  mediaType?: string,
  mediaId?: number,
): ExtendedStreamPayload | null {
  return pinnedFromLedger(loadLastStreamLedger(mediaType, mediaId));
}

export function recordPlayOnLedger(
  ledger: LastStreamLedger,
  stream: RawStreamPayload,
  now = Date.now(),
): LastStreamLedger {
  const id = streamPlayIdentity(stream);
  if (!id || id === "title:") return ledger;
  const prev = ledger.byId[id];
  const playCount = (prev?.playCount ?? 0) + 1;
  const next: LastStreamLedger = {
    byId: {
      ...ledger.byId,
      [id]: {
        stream: { ...(prev?.stream ?? {}), ...snapshotStream(stream) },
        playCount,
        lastPlayedAt: now,
      },
    },
    pinnedId: playCount >= LAST_STREAM_PIN_AFTER_PLAYS ? id : ledger.pinnedId,
  };
  return next;
}

export function useLastSelectedStream(mediaType: string | undefined, mediaId: number) {
  const [lastSelected, setLastSelected] = useState<ExtendedStreamPayload | null>(() =>
    readLastSelectedStream(mediaType, mediaId),
  );

  useEffect(() => {
    setLastSelected(readLastSelectedStream(mediaType, mediaId));
  }, [mediaType, mediaId]);

  const persistLedger = useCallback(
    (ledger: LastStreamLedger) => {
      if (!mediaType || !mediaId) return;
      Storage.set(lastSelectedStreamKey(mediaType, mediaId), ledger);
      setLastSelected(pinnedFromLedger(ledger));
    },
    [mediaType, mediaId],
  );

  const recordPlay = useCallback(
    (stream: RawStreamPayload) => {
      if (!mediaType || !mediaId) return;
      persistLedger(recordPlayOnLedger(loadLastStreamLedger(mediaType, mediaId), stream));
    },
    [mediaType, mediaId, persistLedger],
  );

  const rememberOverride = useCallback(
    (hash: string | undefined, override: StreamOverrideSummary | undefined) => {
      if (!mediaType || !mediaId) return;
      const ledger = loadLastStreamLedger(mediaType, mediaId);
      const needle = (hash || "").trim().toLowerCase();
      let changed = false;
      const byId = { ...ledger.byId };
      for (const [id, candidate] of Object.entries(byId)) {
        const candidateHash = (candidate.stream.hash || "").trim().toLowerCase();
        if (needle && candidateHash && candidateHash !== needle) continue;
        if (!needle && candidateHash) continue;
        byId[id] = { ...candidate, stream: { ...candidate.stream, override } };
        changed = true;
        if (needle) break;
      }
      if (!changed) return;
      persistLedger({ ...ledger, byId });
    },
    [mediaType, mediaId, persistLedger],
  );

  return { lastSelected, recordPlay, rememberOverride };
}

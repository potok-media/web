import type { ContinueWatchingCursor } from "./continueWatching";
import type { LastSourceAudioCandidate, MediaCard } from "../network/ApiTypes";
import { sanitizeLastSourceAudios } from "./lastSource";

/**
 * Continue-watch snapshot codec — the single contract between resume entry points (profile
 * hero, continue rail, home row) and the /continue-watch restore page.
 *
 * Snapshot shape (v1):
 *   { v: 1, kind: "plugin",  providerId, sourceStream, season?, episode?, voice?, position, audios?, tmdbId? }
 *   { v: 1, kind: "torrent", providerId, sourceStream, streamHash, fileIndex?, season?, episode?, voice?, position, audios?, tmdbId? }
 *
 * Both kinds carry the owning plugin identity + opaque sourceStream because the restore page
 * RE-RESOLVES the stream through the plugin sandbox (fresh tokens) — no streamUrl/headers are
 * ever snapshotted. `audios` is the trimmed full voice-candidate list (cross-provider merge)
 * so the restored menu shows every voice, not just the watched one. `tmdbId` feeds the
 * episode-still rail and real progress keys. Encoding is base64url(JSON); decoding is
 * tolerant: bad input, wrong version, or an oversized payload decodes to null and the page
 * renders its empty state.
 */

export const VIDEO_SETTINGS_QUERY_PARAM = "videoSettings";
export const VIDEO_SETTINGS_SNAPSHOT_VERSION = 1;
/** Upper bound for the encoded payload; the server-side lastSource cap is 16KB, this is headroom for base64 (+33%). */
export const VIDEO_SETTINGS_MAX_BYTES = 24576;

interface VideoSettingsBase {
  v: number;
  position: number;
  season?: number;
  episode?: number;
  voice?: string;
  /** Trimmed voice-candidate list (name/label/voice/providerId/sourceId[/query]) — menu restore. */
  audios?: LastSourceAudioCandidate[];
  /** TMDB identity: episode-still rail + real progress keys on the restored descriptor. */
  tmdbId?: number;
}

export interface PluginVideoSettings extends VideoSettingsBase {
  kind: "plugin";
  providerId: string;
  sourceStream: unknown;
}

export interface TorrentVideoSettings extends VideoSettingsBase {
  kind: "torrent";
  providerId: string;
  sourceStream: unknown;
  streamHash: string;
  fileIndex?: string;
}

export type VideoSettingsSnapshot = PluginVideoSettings | TorrentVideoSettings;

function toBase64Url(json: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  // Node (tests): Buffer is always available there.
  return Buffer.from(json, "utf8").toString("base64url");
}

function fromBase64Url(raw: string): string | null {
  try {
    if (typeof atob === "function") {
      const bin = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function encodeVideoSettings(snapshot: VideoSettingsSnapshot): string {
  return toBase64Url(JSON.stringify(snapshot));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeBase(raw: Record<string, unknown>): Omit<VideoSettingsBase, "v"> | null {
  if (!isFiniteNumber(raw.position) || raw.position < 0) return null;
  const base: Omit<VideoSettingsBase, "v"> = { position: Math.floor(raw.position) };
  if (raw.season !== undefined) {
    if (!isFiniteNumber(raw.season)) return null;
    base.season = raw.season;
  }
  if (raw.episode !== undefined) {
    if (!isFiniteNumber(raw.episode)) return null;
    base.episode = raw.episode;
  }
  if (raw.voice !== undefined) {
    if (typeof raw.voice !== "string") return null;
    base.voice = raw.voice;
  }
  if (raw.audios !== undefined) {
    const audios = sanitizeLastSourceAudios(raw.audios);
    if (audios) base.audios = audios;
  }
  if (raw.tmdbId !== undefined) {
    if (!isFiniteNumber(raw.tmdbId) || raw.tmdbId <= 0) return null;
    base.tmdbId = Math.floor(raw.tmdbId);
  }
  return base;
}

export function decodeVideoSettings(raw: string | null | undefined): VideoSettingsSnapshot | null {
  if (!raw || typeof raw !== "string" || raw.length > VIDEO_SETTINGS_MAX_BYTES) return null;
  const json = fromBase64Url(raw);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  // Version-tolerant contract: v1 is the only schema so far; anything else is undecodable.
  if (record.v !== VIDEO_SETTINGS_SNAPSHOT_VERSION) return null;
  const base = sanitizeBase(record);
  if (!base) return null;
  if (typeof record.providerId !== "string" || !record.providerId) return null;

  if (record.kind === "plugin") {
    return { v: 1, kind: "plugin", providerId: record.providerId, sourceStream: record.sourceStream, ...base };
  }
  if (record.kind === "torrent") {
    if (typeof record.streamHash !== "string" || !record.streamHash) return null;
    const snapshot: TorrentVideoSettings = {
      v: 1,
      kind: "torrent",
      providerId: record.providerId,
      sourceStream: record.sourceStream,
      streamHash: record.streamHash,
      ...base,
    };
    if (record.fileIndex !== undefined) {
      if (record.fileIndex != null && typeof record.fileIndex !== "string" && typeof record.fileIndex !== "number") {
        return null;
      }
      snapshot.fileIndex = record.fileIndex != null ? String(record.fileIndex) : undefined;
    }
    return snapshot;
  }
  return null;
}

/**
 * Snapshot derivation from a server continue-watching card. Torrent rows (streamHash present)
 * become torrent snapshots; online rows with a sourceStream become plugin snapshots. Rows
 * saved before the source descriptor existed derive nothing (the entry point falls back).
 * Accepts any item carrying the tmdb id + resume payload — title-level cards and
 * episode-level continue-watching rows alike (the resume payload is per-row, so the snapshot
 * is per-episode by construction).
 */
export function videoSettingsFromCard(card: Pick<MediaCard, "id" | "resume">): VideoSettingsSnapshot | null {
  const resume = card.resume;
  const lastSource = resume?.lastSource;
  if (!resume || !lastSource?.providerId) return null;
  const base = {
    v: VIDEO_SETTINGS_SNAPSHOT_VERSION,
    providerId: lastSource.providerId,
    sourceStream: lastSource.sourceStream,
    season: resume.season ?? undefined,
    episode: resume.episode ?? undefined,
    voice: lastSource.voice,
    position: Number(resume.progressSeconds) || 0,
    audios: sanitizeLastSourceAudios(lastSource.audios) ?? undefined,
    tmdbId: typeof card.id === "number" && card.id > 0 ? card.id : undefined,
  };
  if (lastSource.streamHash) {
    return {
      ...base,
      kind: "torrent",
      streamHash: lastSource.streamHash,
      fileIndex: lastSource.fileIndex != null ? String(lastSource.fileIndex) : undefined,
    };
  }
  if (lastSource.sourceStream !== undefined) {
    return { ...base, kind: "plugin" };
  }
  return null;
}

/** Snapshot derivation from a local ledger cursor (home row, guest continue-watching). */
export function videoSettingsFromCursor(cursor: ContinueWatchingCursor): VideoSettingsSnapshot | null {
  if (!cursor.providerId) return null;
  const base = {
    v: VIDEO_SETTINGS_SNAPSHOT_VERSION,
    providerId: cursor.providerId,
    sourceStream: cursor.sourceStream,
    season: cursor.season,
    episode: cursor.episode,
    voice: cursor.audioName,
    position: Number(cursor.progressSeconds) || 0,
    audios: sanitizeLastSourceAudios(cursor.audios) ?? undefined,
    tmdbId: cursor.tmdbId,
  };
  if (cursor.streamHash) {
    return {
      ...base,
      kind: "torrent",
      streamHash: cursor.streamHash,
      fileIndex: cursor.fileIndex,
    };
  }
  if (cursor.sourceStream !== undefined) {
    return { ...base, kind: "plugin" };
  }
  return null;
}

/**
 * Snapshot → ledger-shaped resume cursor. The snapshot carries no title/tmdb identity (the
 * codec contract is intentionally minimal), so the context the plugin receives is sparse —
 * the owning plugin resolves from sourceStream/streamHash, which is all the restore needs.
 */
export function cursorFromVideoSettings(snapshot: VideoSettingsSnapshot): ContinueWatchingCursor {
  return {
    key: snapshot.kind === "torrent" ? `torrent:${snapshot.streamHash}` : `plugin:${snapshot.providerId}`,
    mediaType: snapshot.season != null || snapshot.episode != null ? "tv" : "movie",
    title: "",
    providerId: snapshot.providerId,
    sourceStream: snapshot.sourceStream,
    streamHash: snapshot.kind === "torrent" ? snapshot.streamHash : undefined,
    fileIndex: snapshot.kind === "torrent" ? snapshot.fileIndex : undefined,
    season: snapshot.season,
    episode: snapshot.episode,
    progressSeconds: snapshot.position,
    durationSeconds: 0,
    audioName: snapshot.voice,
    audios: snapshot.audios,
    tmdbId: snapshot.tmdbId,
    updatedAt: Date.now(),
  };
}

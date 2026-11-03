import { useSyncExternalStore } from "react";
import { Storage } from "./StorageService";
import type { MediaCard } from "../network/ApiTypes";

/**
 * Host-owned "Continue watching" ledger.
 *
 * Cross-source by definition: any stream source (potok-torrents, potok-online-balancers, future
 * plugins) feeds it through the playback tracker, and resume goes back through the source's
 * sandbox (STREAM_SOURCE_GET_EPISODES / STREAM_SOURCE_GET_PLAYBACK_INFO). Keyed by the ARM
 * workId when available, falling back to a tmdb-scoped identity — never by provider internals.
 */

export const CONTINUE_WATCHING_STORAGE_KEY = "potok_continue_watching";
export const CONTINUE_WATCHING_MAX_ITEMS = 8;
export const CONTINUE_WATCHING_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const ARM_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARM_NULL_ID = "00000000-0000-0000-0000-000000000000";
const EPISODE_SUFFIX = /\s+-\s+S\d+E\d+.*$/;

export interface ContinueWatchingCursor {
  /** Ledger key: canonical ARM workId, or `tmdb:<id>` when ARM identity is absent. */
  key: string;
  workId?: string;
  tmdbId?: number;
  entryId?: string;
  episodeId?: string;
  mediaType: "movie" | "tv";
  title: string;
  posterSrc?: string;
  backdropSrc?: string;
  stillSrc?: string;
  /** Source plugin that owns sourceStream — resume target in the sandbox bridge. */
  providerId?: string;
  /** Opaque plugin-owned progress identity (alternative to streamHash/fileIndex). */
  progressId?: string;
  streamHash?: string;
  fileIndex?: string;
  /** Opaque plugin-owned stream payload, passed back verbatim for resume. */
  sourceStream?: unknown;
  season?: number;
  episode?: number;
  progressSeconds: number;
  durationSeconds: number;
  audioName?: string;
  updatedAt: number;
}

/** Progress payload shape broadcast by usePlaybackTracker (superset — extra fields ignored). */
export interface ContinueProgressPayload {
  id?: number;
  mediaType?: string;
  season?: number;
  episode?: number;
  workId?: string | null;
  episodeId?: string | null;
  entryId?: string | null;
  title?: string;
  posterSrc?: string;
  backdropSrc?: string;
  streamHash?: string;
  fileIndex?: string;
  providerId?: string;
  /** Opaque plugin-owned progress identity (alternative to streamHash/fileIndex). */
  progressId?: string;
  voice?: string;
  sourceStream?: unknown;
  stillSrc?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  isCompleted?: boolean;
}

export function canonicalArmId(value: unknown): string | undefined {
  return typeof value === "string" && ARM_UUID.test(value) && value.toLowerCase() !== ARM_NULL_ID
    ? value.toLowerCase()
    : undefined;
}

/** "Game of Thrones - S01E03..." → "Game of Thrones" (release titles carry the episode suffix). */
export function stripEpisodeSuffix(title: string): string {
  return title.replace(EPISODE_SUFFIX, "");
}

export function formatTimecode(seconds: unknown): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "12:34 / 45:00" — empty total half when duration is unknown. */
export function formatProgressLabel(progressSeconds: unknown, durationSeconds: unknown): string {
  const time = formatTimecode(progressSeconds);
  const total = Number(durationSeconds) > 0 ? formatTimecode(durationSeconds) : "";
  return total ? `${time} / ${total}` : time;
}

function resolveLedgerKey(payload: ContinueProgressPayload): string | undefined {
  const workId = canonicalArmId(payload.workId);
  if (workId) return workId;
  const tmdbId = typeof payload.id === "number" && Number.isFinite(payload.id) && payload.id > 0
    ? Math.floor(payload.id)
    : undefined;
  return tmdbId !== undefined ? `tmdb:${tmdbId}` : undefined;
}

function hasStreamIdentity(payload: ContinueProgressPayload): boolean {
  if (payload.progressId) return true;
  return Boolean(payload.streamHash) && payload.fileIndex != null && payload.fileIndex !== "";
}

function normalizeStoredCursor(key: string, raw: unknown): ContinueWatchingCursor | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Partial<ContinueWatchingCursor> & { WorkId?: string; UpdatedAt?: number | string };
  const workId = canonicalArmId(record.workId ?? record.WorkId);
  const tmdbMatch = /^tmdb:(\d+)$/.exec(key);
  let updatedAt = record.updatedAt ?? record.UpdatedAt;
  if (typeof updatedAt === "string") updatedAt = Date.parse(updatedAt);
  if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) return null;
  if (!workId && !tmdbMatch) return null;
  return {
    key,
    workId,
    tmdbId: typeof record.tmdbId === "number" ? record.tmdbId
      : tmdbMatch ? Number(tmdbMatch[1]) : undefined,
    entryId: canonicalArmId(record.entryId),
    episodeId: canonicalArmId(record.episodeId),
    mediaType: record.mediaType === "movie" ? "movie" : "tv",
    title: typeof record.title === "string" ? record.title : "",
    posterSrc: typeof record.posterSrc === "string" ? record.posterSrc : undefined,
    backdropSrc: typeof record.backdropSrc === "string" ? record.backdropSrc : undefined,
    stillSrc: typeof record.stillSrc === "string" ? record.stillSrc : undefined,
    providerId: typeof record.providerId === "string" && record.providerId ? record.providerId : undefined,
    progressId: typeof record.progressId === "string" && record.progressId ? record.progressId : undefined,
    streamHash: typeof record.streamHash === "string" ? record.streamHash : undefined,
    fileIndex: typeof record.fileIndex === "string" ? record.fileIndex : undefined,
    sourceStream: record.sourceStream,
    season: typeof record.season === "number" ? record.season : undefined,
    episode: typeof record.episode === "number" ? record.episode : undefined,
    progressSeconds: Number(record.progressSeconds) || 0,
    durationSeconds: Number(record.durationSeconds) || 0,
    audioName: typeof record.audioName === "string" ? record.audioName : undefined,
    updatedAt,
  };
}

// --- Pure ledger operations (unit-tested without storage) ---

export type ContinueLedger = Record<string, ContinueWatchingCursor>;

export function applyProgressToLedger(
  ledger: ContinueLedger,
  payload: ContinueProgressPayload,
  now: number = Date.now(),
): { ledger: ContinueLedger; changed: boolean } {
  const key = resolveLedgerKey(payload);
  if (!key) return { ledger, changed: false };

  if (payload.isCompleted) {
    if (!(key in ledger)) return { ledger, changed: false };
    const next = { ...ledger };
    delete next[key];
    return { ledger: next, changed: true };
  }

  if (!hasStreamIdentity(payload)) return { ledger, changed: false };

  const workId = canonicalArmId(payload.workId);
  const prev = ledger[key];
  const sameEpisode = Boolean(prev)
    && prev.streamHash === payload.streamHash
    && String(prev.fileIndex) === String(payload.fileIndex)
    && prev.episodeId === canonicalArmId(payload.episodeId);
  const sourceStream = payload.sourceStream && typeof payload.sourceStream === "object"
    ? payload.sourceStream
    : prev?.sourceStream;

  const next: ContinueLedger = { ...ledger };
  next[key] = {
    key,
    workId,
    tmdbId: /^tmdb:(\d+)$/.exec(key) ? Number(key.slice(5)) : undefined,
    entryId: canonicalArmId(payload.entryId),
    episodeId: canonicalArmId(payload.episodeId),
    mediaType: payload.mediaType === "movie" ? "movie" : "tv",
    title: stripEpisodeSuffix(payload.title || "") || (prev?.title ?? ""),
    posterSrc: payload.posterSrc ?? prev?.posterSrc,
    backdropSrc: payload.backdropSrc ?? prev?.backdropSrc,
    stillSrc: payload.stillSrc ?? (sameEpisode ? prev?.stillSrc : undefined),
    providerId: payload.providerId ?? prev?.providerId,
    progressId: payload.progressId ?? prev?.progressId,
    streamHash: payload.streamHash ?? prev?.streamHash,
    fileIndex: payload.fileIndex != null ? String(payload.fileIndex) : prev?.fileIndex,
    sourceStream,
    season: payload.season ?? prev?.season,
    episode: payload.episode ?? prev?.episode,
    progressSeconds: Number(payload.progressSeconds) || 0,
    durationSeconds: Number(payload.durationSeconds) || 0,
    audioName: payload.voice ?? prev?.audioName,
    updatedAt: now,
  };

  const ordered = Object.values(next)
    .filter((cursor) => now - cursor.updatedAt < CONTINUE_WATCHING_MAX_AGE_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const pruned: ContinueLedger = {};
  for (const cursor of ordered.slice(0, CONTINUE_WATCHING_MAX_ITEMS)) {
    pruned[cursor.key] = cursor;
  }
  return { ledger: pruned, changed: true };
}

export function listCursorsFromLedger(
  ledger: ContinueLedger,
  now: number = Date.now(),
): ContinueWatchingCursor[] {
  return Object.values(ledger)
    .filter((cursor) => now - cursor.updatedAt < CONTINUE_WATCHING_MAX_AGE_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, CONTINUE_WATCHING_MAX_ITEMS);
}

// --- Storage-bound singleton + subscription ---

function loadLedger(): ContinueLedger {
  const raw = Storage.get<Record<string, unknown>>(CONTINUE_WATCHING_STORAGE_KEY, {});
  const ledger: ContinueLedger = {};
  for (const [key, value] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
    const cursor = normalizeStoredCursor(key, value);
    if (cursor) ledger[key] = cursor;
  }
  return ledger;
}

function saveLedger(ledger: ContinueLedger): void {
  Storage.set(CONTINUE_WATCHING_STORAGE_KEY, ledger);
}

const listeners = new Set<() => void>();
let cachedList: ContinueWatchingCursor[] | null = null;

function getSnapshot(): ContinueWatchingCursor[] {
  if (!cachedList) cachedList = listCursorsFromLedger(loadLedger());
  return cachedList;
}

function notify(): void {
  cachedList = null;
  listeners.forEach((listener) => listener());
}

export function subscribeContinueWatching(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Feed one broadcast progress payload into the ledger. No-op for foreign/identity-less payloads. */
export function applyContinueProgress(payload: ContinueProgressPayload): void {
  const { ledger, changed } = applyProgressToLedger(loadLedger(), payload);
  if (!changed) return;
  saveLedger(ledger);
  notify();
}

/** Latest first, TTL-filtered, capped — what the home row renders. */
export function listContinueCursors(): ContinueWatchingCursor[] {
  return getSnapshot();
}

/** Ledger cursor → MediaCard with the episode pill + watch-progress bar the continue UI expects.
 * Carries the same image/resume fields the server cards do, so the profile hero and rail render
 * local and server rows identically. */
export function continueCursorToMediaCard(cursor: ContinueWatchingCursor): MediaCard {
  const percentage = cursor.durationSeconds > 0
    ? Math.min(100, Math.round((cursor.progressSeconds / cursor.durationSeconds) * 100))
    : 0;
  return {
    id: cursor.tmdbId ?? 0,
    potokId: cursor.workId,
    entryId: cursor.entryId,
    title: cursor.title,
    mediaType: cursor.mediaType,
    posterSrc: cursor.posterSrc,
    backdropSrc: cursor.backdropSrc,
    subtitle: formatProgressLabel(cursor.progressSeconds, cursor.durationSeconds),
    resume: {
      season: cursor.season,
      episode: cursor.episode,
      progressSeconds: cursor.progressSeconds,
      durationSeconds: cursor.durationSeconds,
    },
    progress: {
      completed: 0,
      aired: 0,
      percentage,
      lastSeason: cursor.season,
      lastEpisode: cursor.episode,
    },
  };
}

/** Reactive read for React components. */
export function useContinueWatchingCursors(): ContinueWatchingCursor[] {
  return useSyncExternalStore(subscribeContinueWatching, getSnapshot);
}

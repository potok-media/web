import { Storage } from "../StorageService";
import { playbackStorageKeys } from "../playbackIdentity";
import type {
  BulkProgressChange,
  BulkProgressMutationResponse,
  HistoryIdentity,
  ProgressMutationResponse,
  SaveBulkProgressRequest,
  SaveProgressRequest,
} from "../../network/SyncHistoryApiClient";
import type { UserHistoryEntry, UserListEntry } from "../../network/SyncApiClient";

/**
 * Guest (unauthenticated) persistence for the legacy sync surface — watchlist, favorites and
 * history progress. Owner decision: guests keep personal data in plain localStorage
 * (potok_guest_* keys), no sync-later guarantees. Progress additionally writes the player's
 * own potok_progress:* / potok_playback_resume:* keys so resume and watched-state read back
 * through the existing player paths.
 */

const WATCHLIST_KEY = "potok_guest_watchlist";
const FAVORITES_KEY = "potok_guest_favorites";
const HISTORY_KEY = "potok_guest_history";
const HISTORY_MAX_ENTRIES = 500;

function readList(key: string): UserListEntry[] {
  const raw = Storage.get<UserListEntry[]>(key, []);
  return Array.isArray(raw) ? raw : [];
}

function writeList(key: string, list: UserListEntry[]): void {
  Storage.set(key, list);
}

function listKey(tmdbId: string, mediaType: string): string {
  return `${mediaType}:${tmdbId}`;
}

function fetchList(key: string): UserListEntry[] {
  return readList(key);
}

function addToList(key: string, tmdbId: string, mediaType: string): void {
  const list = readList(key);
  if (list.some((entry) => listKey(entry.tmdbId, entry.mediaType) === listKey(tmdbId, mediaType))) return;
  list.unshift({ tmdbId, mediaType, addedAt: new Date().toISOString() });
  writeList(key, list);
}

function removeFromList(key: string, tmdbId: string, mediaType: string): void {
  const list = readList(key);
  const next = list.filter((entry) => listKey(entry.tmdbId, entry.mediaType) !== listKey(tmdbId, mediaType));
  if (next.length !== list.length) writeList(key, next);
}

function readHistory(): UserHistoryEntry[] {
  const raw = Storage.get<UserHistoryEntry[]>(HISTORY_KEY, []);
  return Array.isArray(raw) ? raw : [];
}

function writeHistory(entries: UserHistoryEntry[]): void {
  Storage.set(HISTORY_KEY, entries.slice(0, HISTORY_MAX_ENTRIES));
}

function historyKey(identity: HistoryIdentity): string {
  return [
    identity.tmdbId ?? "",
    identity.mediaType,
    identity.seasonNumber ?? 0,
    identity.episodeNumber ?? 0,
    identity.workId ?? "",
    identity.episodeId ?? "",
  ].join("|");
}

interface LocalProgressRecord {
  progressSeconds: number;
  durationSeconds: number;
  lastWatchedAt: string;
  isCompleted: boolean;
}

/** Mirrors the player's own local progress keys (see usePlaybackTracker) for a TMDB identity. */
function writeLocalProgress(identity: HistoryIdentity, progressSeconds: number, durationSeconds: number): void {
  const tmdbId = Number(identity.tmdbId);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return;
  const { progressKey, resumeKey } = playbackStorageKeys({
    id: tmdbId,
    mediaType: identity.mediaType,
    season: identity.seasonNumber,
    episode: identity.episodeNumber,
  });
  const isCompleted = durationSeconds > 0 && progressSeconds / durationSeconds > 0.9;
  const record: LocalProgressRecord = {
    progressSeconds,
    durationSeconds,
    lastWatchedAt: new Date().toISOString(),
    isCompleted,
  };
  Storage.set(progressKey, record);
  if (isCompleted) {
    Storage.remove(resumeKey);
  } else {
    // JSON.stringify(number) has no quotes, so the player reading raw localStorage gets a clean scalar.
    Storage.set(resumeKey, progressSeconds);
  }
}

function removeLocalProgress(identity: HistoryIdentity): void {
  const tmdbId = Number(identity.tmdbId);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0) return;
  const { progressKey, resumeKey } = playbackStorageKeys({
    id: tmdbId,
    mediaType: identity.mediaType,
    season: identity.seasonNumber,
    episode: identity.episodeNumber,
  });
  Storage.remove(progressKey);
  Storage.remove(resumeKey);
}

function upsertHistory(entry: UserHistoryEntry): void {
  const entries = readHistory();
  const key = historyKey(entry);
  const next = entries.filter((existing) => historyKey(existing) !== key);
  next.unshift(entry);
  writeHistory(next);
}

function removeHistory(identity: HistoryIdentity): void {
  const entries = readHistory();
  const key = historyKey(identity);
  writeHistory(entries.filter((existing) => historyKey(existing) !== key));
}

function toHistoryEntry(identity: HistoryIdentity, progressSeconds: number, durationSeconds: number): UserHistoryEntry {
  return {
    tmdbId: identity.tmdbId,
    mediaType: identity.mediaType,
    seasonNumber: identity.seasonNumber,
    episodeNumber: identity.episodeNumber,
    workId: identity.workId,
    episodeId: identity.episodeId,
    progressSeconds,
    durationSeconds,
    lastWatchedAt: new Date().toISOString(),
  };
}

function progressResponse(progressSeconds: number, durationSeconds: number): ProgressMutationResponse {
  return {
    success: true,
    isCompleted: durationSeconds > 0 && progressSeconds / durationSeconds > 0.9,
    traktSync: { state: "notApplicable" },
  };
}

export const guestSync = {
  fetchWatchlist: (): Promise<UserListEntry[]> => Promise.resolve(fetchList(WATCHLIST_KEY)),
  addWatchlist: (tmdbId: string, mediaType: string): Promise<void> => {
    addToList(WATCHLIST_KEY, tmdbId, mediaType);
    return Promise.resolve();
  },
  removeWatchlist: (tmdbId: string, mediaType: string): Promise<void> => {
    removeFromList(WATCHLIST_KEY, tmdbId, mediaType);
    return Promise.resolve();
  },

  fetchFavorites: (): Promise<UserListEntry[]> => Promise.resolve(fetchList(FAVORITES_KEY)),
  addFavorite: (tmdbId: string, mediaType: string): Promise<void> => {
    addToList(FAVORITES_KEY, tmdbId, mediaType);
    return Promise.resolve();
  },
  removeFavorite: (tmdbId: string, mediaType: string): Promise<void> => {
    removeFromList(FAVORITES_KEY, tmdbId, mediaType);
    return Promise.resolve();
  },

  fetchHistory: (): Promise<UserHistoryEntry[]> => Promise.resolve(readHistory()),

  saveProgress: (request: SaveProgressRequest): Promise<ProgressMutationResponse> => {
    upsertHistory(toHistoryEntry(request, request.progressSeconds, request.durationSeconds));
    writeLocalProgress(request, request.progressSeconds, request.durationSeconds);
    return Promise.resolve(progressResponse(request.progressSeconds, request.durationSeconds));
  },

  removeProgress: (request: SaveProgressRequest | HistoryIdentity): Promise<ProgressMutationResponse> => {
    removeHistory(request);
    removeLocalProgress(request);
    return Promise.resolve(progressResponse(0, 0));
  },

  saveBulkProgress: (request: SaveBulkProgressRequest): Promise<BulkProgressMutationResponse> => {
    const traktSync: BulkProgressMutationResponse["traktSync"] = [];
    for (const change of request.changes as BulkProgressChange[]) {
      const identity: HistoryIdentity = {
        tmdbId: request.tmdbId,
        mediaType: request.mediaType,
        seasonNumber: change.seasonNumber,
        episodeNumber: change.episodeNumber,
        workId: request.workId,
        episodeId: change.episodeId,
      };
      if (change.isWatched) {
        upsertHistory(toHistoryEntry(identity, 100, 100));
        writeLocalProgress(identity, 100, 100);
      } else {
        removeHistory(identity);
        removeLocalProgress(identity);
      }
      traktSync.push({ episodeId: change.episodeId ?? null, result: { state: "notApplicable" } });
    }
    return Promise.resolve({ success: true, traktSync });
  },
};

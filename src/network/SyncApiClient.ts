import { Storage } from "../utils/StorageService";
import { ApiClient } from "./ApiClient";
import type { MediaCard } from "./ApiClient";
import { DataWorkerBridge } from "../utils/worker/DataWorkerBridge";
import { traktBulkHistoryPayload, traktMediaPayload } from "./syncTraktPayloads";

export interface UserHistoryEntry {
  tmdbId: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  progressSeconds: number;
  durationSeconds: number;
  lastWatchedAt?: string;
}

export interface UserListEntry {
  tmdbId: string;
  mediaType: string;
  addedAt?: string;
}

export class SyncApiClient {
  public static get syncStrategy(): string {
    return Storage.get<string>("syncStrategy", "none");
  }

  public static async fetchSyncHistory(): Promise<UserHistoryEntry[]> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<UserHistoryEntry[]>("sync_fetchSyncHistory", []);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/history`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch sync history (Status ${res.status})`);
      return res.json();
    } else if (this.syncStrategy === "trakt") {
      const res = await fetch(`${ApiClient.baseURL}/api/library/history`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch Trakt history (Status ${res.status})`);
      const cards = await res.json() as MediaCard[];
      const entries: UserHistoryEntry[] = [];
      for (const c of cards) {
        if (c.progress?.watchedEpisodes && c.progress.watchedEpisodes.length > 0) {
          for (const ep of c.progress.watchedEpisodes) {
            entries.push({
              tmdbId: c.id.toString(),
              mediaType: "tv",
              seasonNumber: ep.season,
              episodeNumber: ep.number,
              progressSeconds: 100,
              durationSeconds: 100,
              lastWatchedAt: new Date().toISOString(),
            });
          }
        }
        // Also add the show card itself for general progress check
        entries.push({
          tmdbId: c.id.toString(),
          mediaType: c.mediaType,
          progressSeconds: c.progress?.percentage || 0,
          durationSeconds: 100,
          lastWatchedAt: new Date().toISOString(),
        });
      }
      return entries;
    }
    return [];
  }

  public static async saveSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number,
    progressSeconds: number = 100,
    durationSeconds: number = 100
  ): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_saveSyncProgress", [
        tmdbId,
        mediaType,
        seasonNumber,
        episodeNumber,
        progressSeconds,
        durationSeconds,
      ]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/history/progress`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({
          tmdbId,
          mediaType,
          seasonNumber,
          episodeNumber,
          progressSeconds,
          durationSeconds,
        }),
      });
      if (!res.ok) throw new Error(`Failed to save progress on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("history", traktMediaPayload(tmdbId, mediaType, seasonNumber, episodeNumber));
    }
  }

  public static async removeSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_removeSyncProgress", [
        tmdbId,
        mediaType,
        seasonNumber,
        episodeNumber,
      ]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/history/remove`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({
          tmdbId,
          mediaType,
          seasonNumber,
          episodeNumber,
        }),
      });
      if (!res.ok) throw new Error(`Failed to remove progress on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("history/remove", traktMediaPayload(tmdbId, mediaType, seasonNumber, episodeNumber));
    }
  }

  public static async fetchSyncFavorites(): Promise<UserListEntry[]> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<UserListEntry[]>("sync_fetchSyncFavorites", []);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch sync favorites (Status ${res.status})`);
      return res.json();
    } else if (this.syncStrategy === "trakt") {
      const res = await fetch(`${ApiClient.baseURL}/api/library/favorites`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch Trakt favorites (Status ${res.status})`);
      const cards = await res.json() as MediaCard[];
      return cards.map((c) => ({ tmdbId: c.id.toString(), mediaType: c.mediaType }));
    }
    return [];
  }

  public static async addSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_addSyncFavorite", [tmdbId, mediaType]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/add`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to add favorite on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("favorites", traktMediaPayload(tmdbId, mediaType));
    }
  }

  public static async removeSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_removeSyncFavorite", [tmdbId, mediaType]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/remove`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to remove favorite on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("favorites/remove", traktMediaPayload(tmdbId, mediaType));
    }
  }

  public static async fetchSyncWatchlist(): Promise<UserListEntry[]> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<UserListEntry[]>("sync_fetchSyncWatchlist", []);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch sync watchlist (Status ${res.status})`);
      return res.json();
    } else if (this.syncStrategy === "trakt") {
      const res = await fetch(`${ApiClient.baseURL}/api/library/watchlist`, {
        headers: ApiClient.headers,
      });
      if (!res.ok) throw new Error(`Failed to fetch Trakt watchlist (Status ${res.status})`);
      const cards = await res.json() as MediaCard[];
      return cards.map((c) => ({ tmdbId: c.id.toString(), mediaType: c.mediaType }));
    }
    return [];
  }

  public static async addSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_addSyncWatchlist", [tmdbId, mediaType]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/add`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to add watchlist on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("watchlist", traktMediaPayload(tmdbId, mediaType));
    }
  }

  public static async removeSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_removeSyncWatchlist", [tmdbId, mediaType]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/remove`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to remove watchlist on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      await ApiClient.syncTraktAction("watchlist/remove", traktMediaPayload(tmdbId, mediaType));
    }
  }

  public static async saveSyncBulkProgress(
    tmdbId: string,
    mediaType: string,
    changes: { seasonNumber: number; episodeNumber: number; isWatched: boolean }[]
  ): Promise<void> {
    if (typeof window !== "undefined") {
      return DataWorkerBridge.request<void>("sync_saveSyncBulkProgress", [tmdbId, mediaType, changes]);
    }
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/history/bulk-progress`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({
          tmdbId,
          mediaType,
          changes,
        }),
      });
      if (!res.ok) throw new Error(`Failed to save bulk progress on server (Status ${res.status})`);
    } else {
      const toAdd = changes.filter(c => c.isWatched);
      const toRemove = changes.filter(c => !c.isWatched);

      if (toAdd.length > 0) {
        await ApiClient.syncTraktAction("history", traktBulkHistoryPayload(tmdbId, toAdd));
      }

      if (toRemove.length > 0) {
        await ApiClient.syncTraktAction("history/remove", traktBulkHistoryPayload(tmdbId, toRemove));
      }
    }
  }
}

import { Storage } from "../utils/StorageService";
import { ApiClient } from "./ApiClient";
import type { MediaCard } from "./ApiClient";

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
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        episodes: mediaType === "episode" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("history", payload);
    }
  }

  public static async removeSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<void> {
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
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        episodes: mediaType === "episode" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("history/remove", payload);
    }
  }

  public static async fetchSyncFavorites(): Promise<UserListEntry[]> {
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
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/add`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to add favorite on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("favorites", payload);
    }
  }

  public static async removeSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/remove`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to remove favorite on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("favorites/remove", payload);
    }
  }

  public static async fetchSyncWatchlist(): Promise<UserListEntry[]> {
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
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/add`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to add watchlist on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("watchlist", payload);
    }
  }

  public static async removeSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    if (this.syncStrategy === "server") {
      const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/remove`, {
        method: "POST",
        headers: ApiClient.headers,
        body: JSON.stringify({ tmdbId, mediaType }),
      });
      if (!res.ok) throw new Error(`Failed to remove watchlist on server (Status ${res.status})`);
    } else if (this.syncStrategy === "trakt") {
      const payload = {
        movies: mediaType === "movie" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
        shows: mediaType === "tv" ? [{ ids: { tmdb: Number(tmdbId) } }] : [],
      };
      await ApiClient.syncTraktAction("watchlist/remove", payload);
    }
  }
}

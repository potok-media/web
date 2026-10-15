import { ApiClient } from "./ApiClient";
import { handleApiResponse } from "./apiClientHelpers";
import {
  createSyncHistoryApiClient,
  type BulkProgressMutationResponse,
  type ProgressMutationResponse,
  type RemoveProgressRequest,
  type SaveBulkProgressRequest,
  type SaveProgressRequest,
} from "./SyncHistoryApiClient";
import type { ArmEpisodeId, ArmWorkId } from "./ArmTypes";

export interface UserHistoryEntry {
  tmdbId?: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  workId?: ArmWorkId;
  episodeId?: ArmEpisodeId;
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
  private static historyClient() {
    return createSyncHistoryApiClient({
      post: async <T>(path: string, body: unknown): Promise<T> => {
        const res = await fetch(`${ApiClient.baseURL}${path}`, {
          method: "POST",
          headers: ApiClient.headers,
          body: JSON.stringify(body),
        });
        return handleApiResponse<T>(res, "Failed to mutate sync history");
      },
    });
  }

  public static async saveHistoryProgress(
    request: SaveProgressRequest,
  ): Promise<ProgressMutationResponse> {
    return this.historyClient().saveProgress(request);
  }

  public static async removeHistoryProgress(
    request: RemoveProgressRequest,
  ): Promise<ProgressMutationResponse> {
    return this.historyClient().removeProgress(request);
  }

  public static async saveHistoryBulkProgress(
    request: SaveBulkProgressRequest,
  ): Promise<BulkProgressMutationResponse> {
    return this.historyClient().saveBulkProgress(request);
  }

  public static async fetchSyncHistory(): Promise<UserHistoryEntry[]> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/history`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch sync history (Status ${res.status})`);
    return res.json();
  }

  public static async saveSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number,
    progressSeconds: number = 100,
    durationSeconds: number = 100
  ): Promise<void> {
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
  }

  public static async removeSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<void> {
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
  }

  public static async fetchSyncFavorites(): Promise<UserListEntry[]> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch sync favorites (Status ${res.status})`);
    return res.json();
  }

  public static async addSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/add`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to add favorite on server (Status ${res.status})`);
  }

  public static async removeSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/favorites/remove`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to remove favorite on server (Status ${res.status})`);
  }

  public static async fetchSyncWatchlist(): Promise<UserListEntry[]> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch sync watchlist (Status ${res.status})`);
    return res.json();
  }

  public static async addSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/add`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to add watchlist on server (Status ${res.status})`);
  }

  public static async removeSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    const res = await fetch(`${ApiClient.baseURL}/api/sync/watchlist/remove`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to remove watchlist on server (Status ${res.status})`);
  }

  public static async saveSyncBulkProgress(
    tmdbId: string,
    mediaType: string,
    changes: { seasonNumber: number; episodeNumber: number; isWatched: boolean }[]
  ): Promise<void> {
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
  }
}

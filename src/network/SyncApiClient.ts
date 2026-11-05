import { ApiClient } from "./ApiClient";
import { handleApiResponse } from "./apiClientHelpers";
import { withLanguageParam } from "./locale";
import { SettingsService } from "../utils/SettingsService";
import type { ContinueWatchingEpisodeItem, LastSourcePayload, MediaCard, ProfileActivityResponse, ProfileSummary } from "./ApiTypes";
import { listContinueCursors, continueCursorToMediaCard, continueCursorToEpisodeItem } from "../utils/continueWatching";
import { resolveTmdbImageUrl } from "../utils/mediaUtils";
import {
  createSyncHistoryApiClient,
  type BulkProgressMutationResponse,
  type ProgressMutationResponse,
  type RemoveBulkProgressRequest,
  type RemoveProgressRequest,
  type SaveBulkProgressRequest,
  type SaveProgressRequest,
} from "./SyncHistoryApiClient";
import type { ArmEpisodeId, ArmWorkId } from "./ArmTypes";
import { getUserSnapshot } from "../sdk/src/user";
import { guestSync } from "../utils/userData/guestSync";

export interface UserHistoryEntry {
  tmdbId?: string;
  mediaType: string;
  seasonNumber?: number;
  episodeNumber?: number;
  workId?: ArmWorkId;
  episodeId?: ArmEpisodeId;
  /** Manual "mark watched" flag — watched ⇔ isWatched OR ≥90% progress. */
  isWatched?: boolean;
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
  // Guests have no server DB — every method falls back to plain localStorage (owner decision).
  // The SDK user snapshot is fed only on the main thread; the data worker never receives it and
  // would silently degrade every call to the guest path. The token is synced to the worker via
  // the settings snapshot, so it is the reliable auth signal on both threads.
  private static get isGuest(): boolean {
    return !getUserSnapshot().isAuth && !SettingsService.getToken();
  }

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
    if (this.isGuest) return guestSync.saveProgress(request);
    return this.historyClient().saveProgress(request);
  }

  public static async removeHistoryProgress(
    request: RemoveProgressRequest,
  ): Promise<ProgressMutationResponse> {
    if (this.isGuest) return guestSync.removeProgress(request);
    return this.historyClient().removeProgress(request);
  }

  public static async saveHistoryBulkProgress(
    request: SaveBulkProgressRequest,
  ): Promise<BulkProgressMutationResponse> {
    if (this.isGuest) return guestSync.saveBulkProgress(request);
    return this.historyClient().saveBulkProgress(request);
  }

  /**
   * Whole-title watch clear (hero «снять просмотр»): removes EVERY history row for the title —
   * both identity spaces and both episode labels — and recounts the per-title status cache.
   */
  public static async removeHistoryTitle(
    request: RemoveBulkProgressRequest,
  ): Promise<ProgressMutationResponse> {
    if (this.isGuest) return guestSync.removeBulkProgress(request);
    return this.historyClient().removeBulkProgress(request);
  }

  public static async fetchSyncHistory(): Promise<UserHistoryEntry[]> {
    if (this.isGuest) return guestSync.fetchHistory();
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
    durationSeconds: number = 100,
    lastSource?: LastSourcePayload
  ): Promise<void> {
    if (this.isGuest) {
      await guestSync.saveProgress({
        tmdbId,
        mediaType,
        seasonNumber,
        episodeNumber,
        progressSeconds,
        durationSeconds,
      });
      return;
    }
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
        ...(lastSource ? { lastSource } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Failed to save progress on server (Status ${res.status})`);
  }

  /**
   * Canonical continue-watching list: hydrated cards with a `resume` payload each. Guests have
   * no server copy — they read the host-owned local ledger instead (same cards the home row uses).
   * Server cards are normalized: relative TMDB image paths become full gateway-proxy URLs so the
   * cards render identically to the home-page cards, and the UI language is passed for hydration.
   */
  public static async fetchContinueWatching(): Promise<MediaCard[]> {
    if (this.isGuest) {
      return listContinueCursors().map(continueCursorToMediaCard);
    }
    const res = await fetch(withLanguageParam(`${ApiClient.baseURL}/api/library/continue-watching`), {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch continue watching (Status ${res.status})`);
    const cards = (await res.json()) as MediaCard[];
    return cards.map((card) => ({
      ...card,
      posterSrc: resolveTmdbImageUrl(card.posterSrc, ApiClient.baseURL),
      backdropSrc: resolveTmdbImageUrl(card.backdropSrc, ApiClient.baseURL),
      logoSrc: resolveTmdbImageUrl(card.logoSrc, ApiClient.baseURL),
    }));
  }

  /**
   * Episode-level continue-watching: in-progress episode rows (progress/duration < 90%), title
   * groups by most recent activity DESC, episodes ascending within a title. Each item carries
   * its own per-episode resume payload — resuming an item restores that episode. Guests and
   * failed fetches degrade to the local ledger (episode coordinates from the saved cursors).
   */
  public static async fetchContinueWatchingEpisodes(): Promise<ContinueWatchingEpisodeItem[]> {
    if (this.isGuest) {
      return listContinueCursors().map(continueCursorToEpisodeItem);
    }
    const res = await fetch(withLanguageParam(`${ApiClient.baseURL}/api/library/continue-watching/episodes`), {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch continue watching episodes (Status ${res.status})`);
    const items = (await res.json()) as ContinueWatchingEpisodeItem[];
    return items.map((item) => ({
      ...item,
      posterSrc: resolveTmdbImageUrl(item.posterSrc, ApiClient.baseURL),
      backdropSrc: resolveTmdbImageUrl(item.backdropSrc, ApiClient.baseURL),
      logoSrc: resolveTmdbImageUrl(item.logoSrc, ApiClient.baseURL),
    }));
  }

  /** Profile summary stats (30-day chart data). Auth-only; guests never call this. */
  public static async fetchProfileSummary(): Promise<ProfileSummary> {
    const res = await fetch(`${ApiClient.baseURL}/api/profile/summary`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch profile summary (Status ${res.status})`);
    return res.json();
  }

  /**
   * Profile «История» activity feed: at most `days` non-empty UTC calendar days per page,
   * newest first. Pass the previous page's `nextBefore` as `before` to load the next window.
   * Auth-only; guests never call this (ProfilePage hides the section for them).
   */
  public static async fetchProfileActivity(
    before: string | null = null,
    days: number = 2,
    limit: number = 50
  ): Promise<ProfileActivityResponse> {
    const params = new URLSearchParams();
    if (before) params.set("before", before);
    params.set("days", String(days));
    params.set("limit", String(limit));
    const res = await fetch(
      withLanguageParam(`${ApiClient.baseURL}/api/profile/activity?${params.toString()}`),
      { headers: ApiClient.headers }
    );
    if (!res.ok) throw new Error(`Failed to fetch profile activity (Status ${res.status})`);
    return res.json();
  }

  public static async removeSyncProgress(
    tmdbId: string,
    mediaType: string,
    seasonNumber?: number,
    episodeNumber?: number
  ): Promise<void> {
    if (this.isGuest) {
      await guestSync.removeProgress({ tmdbId, mediaType, seasonNumber, episodeNumber });
      return;
    }
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
    if (this.isGuest) return guestSync.fetchFavorites();
    const res = await fetch(`${ApiClient.baseURL}/api/library/favorites`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch sync favorites (Status ${res.status})`);
    return res.json();
  }

  public static async addSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    if (this.isGuest) return guestSync.addFavorite(tmdbId, mediaType);
    const res = await fetch(`${ApiClient.baseURL}/api/library/favorites`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to add favorite on server (Status ${res.status})`);
  }

  public static async removeSyncFavorite(tmdbId: string, mediaType: string): Promise<void> {
    if (this.isGuest) return guestSync.removeFavorite(tmdbId, mediaType);
    const res = await fetch(`${ApiClient.baseURL}/api/library/favorites`, {
      method: "DELETE",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to remove favorite on server (Status ${res.status})`);
  }

  public static async fetchSyncWatchlist(): Promise<UserListEntry[]> {
    if (this.isGuest) return guestSync.fetchWatchlist();
    const res = await fetch(`${ApiClient.baseURL}/api/library/watchlist`, {
      headers: ApiClient.headers,
    });
    if (!res.ok) throw new Error(`Failed to fetch sync watchlist (Status ${res.status})`);
    return res.json();
  }

  public static async addSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    if (this.isGuest) return guestSync.addWatchlist(tmdbId, mediaType);
    const res = await fetch(`${ApiClient.baseURL}/api/library/watchlist`, {
      method: "POST",
      headers: ApiClient.headers,
      body: JSON.stringify({ tmdbId, mediaType }),
    });
    if (!res.ok) throw new Error(`Failed to add watchlist on server (Status ${res.status})`);
  }

  public static async removeSyncWatchlist(tmdbId: string, mediaType: string): Promise<void> {
    if (this.isGuest) return guestSync.removeWatchlist(tmdbId, mediaType);
    const res = await fetch(`${ApiClient.baseURL}/api/library/watchlist`, {
      method: "DELETE",
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
    if (this.isGuest) {
      await guestSync.saveBulkProgress({ tmdbId, mediaType, changes });
      return;
    }
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

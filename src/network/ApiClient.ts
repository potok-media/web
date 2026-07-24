import { DataWorkerBridge } from "../utils/worker/DataWorkerBridge";
import { SettingsService } from "../utils/SettingsService";
import { MemorySafeCache } from "./MemorySafeCache";
import { SyncApiClient } from "./SyncApiClient";
import { ensureAbsoluteURL, handleApiResponse } from "./apiClientHelpers";
import { ApiError } from "./ApiTypes";
import { webSocketClient } from "./WebSocketClient";
import type { ExtensionManifest } from "@potok/sdk-types";
import type {
  ServiceInfo,
  ServiceStatus,
  HandshakeResponse,
  MediaCard,
  WatchProgress,
  HeroItem,
  HomeResponse,
  TvSeason,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
  StreamUIItem,
  PersonDetails,
} from "./ApiTypes";

export type {
  ServiceInfo,
  ServiceStatus,
  HandshakeResponse,
  MediaCard,
  WatchProgress,
  HeroItem,
  HomeResponse,
  TvSeason,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
  StreamUIItem,
};


export class ApiClient {
  private static isWorker = typeof window === "undefined";

  public static get isSettingsLocked(): boolean {
    return SettingsService.isSettingsLocked();
  }

  private static get language(): string {
    return SettingsService.getLanguage();
  }

  private static mediaDetailsCache = new Map<string, MediaCard>();

  public static invalidateCache(): void {
    this.mediaDetailsCache.clear();
    MemorySafeCache.clearAll();
    if (!this.isWorker) {
      DataWorkerBridge.postToWorker({ type: "invalidate_cache" });
    }
  }

  public static get baseURL(): string {
    return SettingsService.getGatewayUrl();
  }

  public static get searchEngineURL(): string {
    return SettingsService.getSearchEngineUrl();
  }

  public static get playerServerURL(): string {
    return SettingsService.getPlayerServerUrl();
  }

  public static get headers(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Id": webSocketClient.clientId,
    };
    const activeProfileID = SettingsService.getActiveProfileId();
    if (activeProfileID) {
      headers["X-Profile-Id"] = activeProfileID;
    }
    const potokToken = SettingsService.getToken();
    if (potokToken) {
      headers["Authorization"] = `Bearer ${potokToken}`;
    }
    return headers;
  }

  public static async performHandshake(url: string): Promise<HandshakeResponse> {
    // Run the handshake directly on the calling thread instead of round-tripping through the data
    // worker. The handshake is a tiny, unauthenticated GET whose result gates first-paint auth UI
    // (e.g. the registration toggle via `multiUserMode`). Routing it through the worker made it wait
    // on the worker's cold start — its module bundle statically pulls in SignalR and the API clients,
    // which must download+parse before it can service its first request — needlessly delaying the
    // button. A plain fetch has the same origin/CORS behavior on the main thread, so nothing is lost.
    const absolute = ensureAbsoluteURL(url);
    const normalized = absolute.replace(/\/$/, "");
    const res = await fetch(`${normalized}/api/handshake`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Handshake failed: ${res.status}`);
    return res.json();
  }

  public static async pingHealth(url: string, path: string, useCors: boolean = false): Promise<ServiceInfo> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<ServiceInfo>("pingHealth", [url, path, useCors]);
    }
    if (!url) return { configured: false, online: false };
    let normalized = url.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    const startTime = Date.now();
    try {
      const options: RequestInit = {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      };
      if (!useCors) {
        options.mode = "no-cors";
      }
      await fetch(`${normalized}${path}`, options);
      const latency = Date.now() - startTime;
      return { configured: true, online: true, latencyMs: latency };
    } catch {
      return { configured: true, online: false };
    }
  }

  public static async fetchHomeFeed(posterSize = "w342", backdropSize = "w1280"): Promise<HomeResponse> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<HomeResponse>("fetchHomeFeed", [posterSize, backdropSize]);
    }
    const url = `${this.baseURL}/api/media/home?posterSize=${encodeURIComponent(posterSize)}&backdropSize=${encodeURIComponent(backdropSize)}&language=${encodeURIComponent(this.language)}`;
    const res = await fetch(url, {
      headers: this.headers,
    });
    return handleApiResponse<HomeResponse>(res, "Failed to fetch home feed");
  }

  public static async searchMedia(query: string): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("searchMedia", [query]);
    }
    const res = await fetch(`${this.baseURL}/api/media/search?query=${encodeURIComponent(query)}&language=${encodeURIComponent(this.language)}`, {
      headers: this.headers,
    });
    return handleApiResponse<MediaCard[]>(res, "Search failed");
  }

  public static getCachedMediaDetails(mediaType: string, id: number): MediaCard | null {
    return this.mediaDetailsCache.get(`${mediaType}:${id}`) || null;
  }

  public static async fetchMediaDetails(mediaType: string, id: number): Promise<MediaCard> {
    const cacheKey = `${mediaType}:${id}`;
    if (!this.isWorker) {
      if (this.mediaDetailsCache.has(cacheKey)) {
        return this.mediaDetailsCache.get(cacheKey)!;
      }
      const details = await DataWorkerBridge.request<MediaCard>("fetchMediaDetails", [mediaType, id]);
      this.mediaDetailsCache.set(cacheKey, details);
      return details;
    }
    if (this.mediaDetailsCache.has(cacheKey)) {
      return this.mediaDetailsCache.get(cacheKey)!;
    }
    const res = await fetch(`${this.baseURL}/api/media/detail/${mediaType}/${id}?language=${encodeURIComponent(this.language)}`, {
      headers: this.headers,
    });
    const details = await handleApiResponse<MediaCard>(res, "Failed to fetch details");
    this.mediaDetailsCache.set(cacheKey, details);
    return details;
  }

  public static async fetchTvSeason(tvId: number, seasonNumber: number, options?: RequestInit): Promise<TvSeason> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<TvSeason>("fetchTvSeason", [tvId, seasonNumber]);
    }
    const res = await fetch(`${this.baseURL}/api/media/tmdb/tv/${tvId}/season/${seasonNumber}?language=${encodeURIComponent(this.language)}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });
    return handleApiResponse<TvSeason>(res, "Failed to fetch season details");
  }

  public static async fetchPersonDetails(personId: number): Promise<PersonDetails> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<PersonDetails>("fetchPersonDetails", [personId]);
    }
    const res = await fetch(`${this.baseURL}/api/tmdb/person/${personId}?append_to_response=combined_credits&language=${encodeURIComponent(this.language)}`, {
      headers: this.headers,
    });
    return handleApiResponse<PersonDetails>(res, "Failed to fetch person details");
  }

  public static async syncTraktAction(path: string, request: TraktSyncRequest): Promise<void> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<void>("syncTraktAction", [path, request]);
    }
    const res = await fetch(`${this.baseURL}/api/trakt/sync/${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new ApiError(`Trakt sync action failed: ${path} (Status ${res.status})`, res.status, errorText);
    }
  }

  public static async fetchMediaRow(rowId: string, page = 1): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("fetchMediaRow", [rowId, page]);
    }
    const res = await fetch(`${this.baseURL}/api/media/row/${rowId}?page=${page}&language=${encodeURIComponent(this.language)}`, {
      headers: this.headers,
    });
    return handleApiResponse<MediaCard[]>(res, `Failed to fetch media row: ${rowId}`);
  }

  public static async fetchBatchDetails(items: { tmdbId: number; mediaType: string }[]): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("fetchBatchDetails", [items]);
    }
    if (items.length === 0) return [];
    const res = await fetch(`${this.baseURL}/api/media/batch?language=${encodeURIComponent(this.language)}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ items, language: this.language }),
    });
    return handleApiResponse<MediaCard[]>(res, "Failed to fetch batch media details");
  }

  public static async fetchLibraryCategory(category: string): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("fetchLibraryCategory", [category]);
    }
    if (category.includes(".")) {
      return this.fetchMediaRow(category);
    }
    const strategy = SettingsService.getSyncStrategy();
    if (strategy === "trakt") {
      const res = await fetch(`${this.baseURL}/api/library/${category}?language=${encodeURIComponent(this.language)}`, {
        headers: this.headers,
      });
      return handleApiResponse<MediaCard[]>(res, `Failed to fetch library category: ${category}`);
    } else if (strategy === "server") {
      let entries: { tmdbId: string; mediaType: string }[] = [];
      if (category === "watchlist") {
        entries = await SyncApiClient.fetchSyncWatchlist();
      } else if (category === "favorites") {
        entries = await SyncApiClient.fetchSyncFavorites();
      } else if (category === "history" || category === "up-next") {
        const hist = await SyncApiClient.fetchSyncHistory();
        entries = hist.map((h) => ({
          tmdbId: h.tmdbId,
          mediaType: h.mediaType === "episode" ? "tv" : h.mediaType,
        }));
      }
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        const key = `${e.tmdbId}_${e.mediaType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return this.fetchBatchDetails(unique.map((e) => ({
        tmdbId: Number(e.tmdbId),
        mediaType: e.mediaType,
      })));
    }
    return [];
  }

  public static async fetchExtensionManifest(url: string, signal?: AbortSignal): Promise<ExtensionManifest> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<ExtensionManifest>("fetchExtensionManifest", [url]);
    }
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }
}

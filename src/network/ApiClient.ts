import { Storage } from "../utils/StorageService";
import { DataWorkerBridge } from "../utils/worker/DataWorkerBridge";
import { SyncApiClient } from "./SyncApiClient";
import { ApiError } from "./ApiTypes";
import { getEnv } from "../utils/EnvService";
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
  InfuseSaveRequest,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
  StreamUIItem,
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
  InfuseSaveRequest,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
  StreamUIItem,
};


export class ApiClient {
  private static isWorker = typeof window === "undefined";

  private static getHostConfig() {
    const envBff = getEnv("VITE_DEFAULT_BFF_URL");
    const isLocked = getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";

    return {
      bff: envBff,
      search: "",
      locked: isLocked,
      profileName: "Main profile"
    };
  }

  private static getDefaultProfiles() {
    const hostConfig = this.getHostConfig();
    return [
      {
        id: "default-profile",
        name: hostConfig.profileName,
        gatewayURL: hostConfig.bff,
        playerServerURL: "",
        searchEngineURL: hostConfig.search,
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      }
    ];
  }

  public static get isSettingsLocked(): boolean {
    return getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";
  }

  // Active UI language from storage (works in the data worker too, where there is no React i18n).
  private static get language(): string {
    return Storage.get<string>("language", "en");
  }

  private static ensureAbsoluteURL(url: string): string {
    if (!url) return "";
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    return normalized;
  }

  private static _cachedBaseURL?: string;
  private static _cachedSearchEngineURL?: string;
  private static _cachedPlayerServerURL?: string;
  private static mediaDetailsCache = new Map<string, MediaCard>();

  public static invalidateCache(): void {
    this._cachedBaseURL = undefined;
    this._cachedSearchEngineURL = undefined;
    this._cachedPlayerServerURL = undefined;
    this.mediaDetailsCache.clear();
    if (!this.isWorker) {
      DataWorkerBridge.postToWorker({ type: "invalidate_cache" });
    }
  }

  public static get baseURL(): string {
    if (!this._cachedBaseURL) {
      const bffEnv = getEnv("VITE_DEFAULT_BFF_URL");
      let url = "";
      if (this.isSettingsLocked && bffEnv) {
        url = bffEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", ApiClient.isSettingsLocked ? defaultProfs[0].id : null);
        const profiles = Storage.get<any[]>("connectionProfiles", defaultProfs);
        const active = profiles.find((p) => p.id === activeID);
        url = active?.gatewayURL || bffEnv || "";
      }
      this._cachedBaseURL = this.ensureAbsoluteURL(url);
    }
    return this._cachedBaseURL;
  }

  public static get searchEngineURL(): string {
    if (!this._cachedSearchEngineURL) {
      const searchEnv = "";
      let url = "";
      if (this.isSettingsLocked) {
        url = searchEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", ApiClient.isSettingsLocked ? defaultProfs[0].id : null);
        const profiles = Storage.get<any[]>("connectionProfiles", defaultProfs);
        const active = profiles.find((p) => p.id === activeID);
        url = active?.searchEngineURL || "";
      }
      this._cachedSearchEngineURL = this.ensureAbsoluteURL(url);
    }
    return this._cachedSearchEngineURL;
  }

  public static get playerServerURL(): string {
    if (!this._cachedPlayerServerURL) {
      const psEnv = "";
      let url = "";
      if (this.isSettingsLocked) {
        url = psEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", ApiClient.isSettingsLocked ? defaultProfs[0].id : null);
        const profiles = Storage.get<any[]>("connectionProfiles", defaultProfs);
        const active = profiles.find((p) => p.id === activeID);
        url = active?.playerServerURL || "";
      }
      if (!url) {
        try {
          const tPluginId = "potok-tor" + "rents";
          const oldGoKey = "tor" + "rentGoURL";
          let pluginScopedUrl = "";
          if (typeof localStorage !== "undefined") {
            pluginScopedUrl = localStorage.getItem("potok_plugin:scoped:" + tPluginId + ":playerServerURL") 
              || localStorage.getItem("potok_plugin:scoped:" + tPluginId + ":" + oldGoKey) || "";
          } else {
            pluginScopedUrl = Storage.get<string>("potok_plugin:scoped:" + tPluginId + ":playerServerURL", "")
              || Storage.get<string>("potok_plugin:scoped:" + tPluginId + ":" + oldGoKey, "");
          }
          if (pluginScopedUrl) {
            url = pluginScopedUrl;
          }
        } catch {}
      }
      this._cachedPlayerServerURL = this.ensureAbsoluteURL(url);
    }
    return this._cachedPlayerServerURL;
  }

  public static get headers(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client-Id": webSocketClient.clientId,
    };
    const defaultProfs = this.getDefaultProfiles();
    const activeProfileID = Storage.get<string | null>("activeProfileID", this.isSettingsLocked ? defaultProfs[0].id : null);
    if (activeProfileID) {
      headers["X-Profile-Id"] = activeProfileID;
    }
    const potokToken = Storage.get<string | null>("potokToken", null);
    if (potokToken) {
      headers["Authorization"] = `Bearer ${potokToken}`;
    } else {
      const traktToken = Storage.get<string | null>("traktAccessToken", null);
      if (traktToken) {
        headers["Authorization"] = `Bearer ${traktToken}`;
      }
    }
    const traktToken = Storage.get<string | null>("traktAccessToken", null);
    if (traktToken) {
      headers["Trakt-Authorization"] = `Bearer ${traktToken}`;
    }
    return headers;
  }

  public static async performHandshake(url: string): Promise<HandshakeResponse> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<HandshakeResponse>("performHandshake", [url]);
    }
    const absolute = this.ensureAbsoluteURL(url);
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

  private static populateProgressPercentage(data: any): any {
    if (!data) return data;
    if (typeof data === "object") {
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = this.populateProgressPercentage(data[i]);
        }
        return data;
      }
      if (data.progress && typeof data.progress === "object") {
        const p = data.progress;
        if (p.percentage === undefined || isNaN(p.percentage)) {
          if (p.aired && p.aired > 0) {
            p.percentage = ((p.completed || 0) * 100) / p.aired;
          } else if (p.completed !== undefined) {
            p.percentage = p.completed > 0 ? 100 : 0;
          } else {
            p.percentage = 0;
          }
        }
      }
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = this.populateProgressPercentage(data[key]);
        }
      }
    }
    return data;
  }

  private static async handleResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new ApiError(`${fallbackMsg} (Status ${res.status})`, res.status, errorText);
    }
    const json = await res.json();
    return this.populateProgressPercentage(json) as T;
  }

  public static async fetchHomeFeed(posterSize = "w342", backdropSize = "w1280"): Promise<HomeResponse> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<HomeResponse>("fetchHomeFeed", [posterSize, backdropSize]);
    }
    const url = `${this.baseURL}/api/media/home?posterSize=${encodeURIComponent(posterSize)}&backdropSize=${encodeURIComponent(backdropSize)}&language=${encodeURIComponent(this.language)}`;
    const res = await fetch(url, {
      headers: this.headers,
    });
    return this.handleResponse<HomeResponse>(res, "Failed to fetch home feed");
  }

  public static async searchMedia(query: string): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("searchMedia", [query]);
    }
    const res = await fetch(`${this.baseURL}/api/media/search?query=${encodeURIComponent(query)}`, {
      headers: this.headers,
    });
    return this.handleResponse<MediaCard[]>(res, "Search failed");
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
    const res = await fetch(`${this.baseURL}/api/media/detail/${mediaType}/${id}`, {
      headers: this.headers,
    });
    const details = await this.handleResponse<MediaCard>(res, "Failed to fetch details");
    this.mediaDetailsCache.set(cacheKey, details);
    return details;
  }

  public static async fetchTvSeason(tvId: number, seasonNumber: number, options?: RequestInit): Promise<TvSeason> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<TvSeason>("fetchTvSeason", [tvId, seasonNumber]);
    }
    const res = await fetch(`${this.baseURL}/api/media/tmdb/tv/${tvId}/season/${seasonNumber}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });
    return this.handleResponse<TvSeason>(res, "Failed to fetch season details");
  }

  public static async saveInfuseItemAndGetStreams(request: InfuseSaveRequest): Promise<string[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<string[]>("saveInfuseItemAndGetStreams", [request]);
    }
    const res = await fetch(`${this.baseURL}/api/infuse/save`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(request),
    });
    return this.handleResponse<string[]>(res, "Failed to save to library");
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
    const res = await fetch(`${this.baseURL}/api/media/row/${rowId}?page=${page}`, {
      headers: this.headers,
    });
    return this.handleResponse<MediaCard[]>(res, `Failed to fetch media row: ${rowId}`);
  }

  public static async fetchBatchDetails(items: { tmdbId: number; mediaType: string }[]): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("fetchBatchDetails", [items]);
    }
    if (items.length === 0) return [];
    const res = await fetch(`${this.baseURL}/api/media/batch`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ items }),
    });
    return this.handleResponse<MediaCard[]>(res, "Failed to fetch batch media details");
  }

  public static async fetchLibraryCategory(category: string): Promise<MediaCard[]> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<MediaCard[]>("fetchLibraryCategory", [category]);
    }
    if (category.includes(".")) {
      return this.fetchMediaRow(category);
    }
    const strategy = Storage.get<string>("syncStrategy", "none");
    if (strategy === "trakt") {
      const res = await fetch(`${this.baseURL}/api/library/${category}`, {
        headers: this.headers,
      });
      return this.handleResponse<MediaCard[]>(res, `Failed to fetch library category: ${category}`);
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

  public static async getStreamMetadata(hash: string, fileId: string | number): Promise<ClientMetadata | null> {
    if (!this.isWorker) {
      return DataWorkerBridge.request<ClientMetadata | null>("getStreamMetadata", [hash, fileId]);
    }
    try {
      const cleanBase = this.playerServerURL.replace(/\/+$/, "");
      const res = await fetch(`${cleanBase}/api/torrents/${hash.toLowerCase()}/files/${fileId}/metadata`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
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

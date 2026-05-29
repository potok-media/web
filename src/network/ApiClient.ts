import { Storage } from "../utils/StorageService";
import { SyncApiClient } from "./SyncApiClient";
import { ApiError } from "./ApiTypes";
import { getEnv } from "../utils/EnvService";
import type {
  ServiceInfo,
  ServiceStatus,
  HandshakeResponse,
  MediaCard,
  WatchProgress,
  HeroItem,
  HomeResponse,
  TorrentSearchResult,
  TorrentOverride,
  TorrentFileItem,
  TvSeason,
  TorrentSearchRequest,
  TorrentFilesRequest,
  StreamUrlRequest,
  InfuseSaveRequest,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
} from "./ApiTypes";

export type {
  ServiceInfo,
  ServiceStatus,
  HandshakeResponse,
  MediaCard,
  WatchProgress,
  HeroItem,
  HomeResponse,
  TorrentSearchResult,
  TorrentOverride,
  TorrentFileItem,
  TvSeason,
  TorrentSearchRequest,
  TorrentFilesRequest,
  StreamUrlRequest,
  InfuseSaveRequest,
  TraktSyncRequest,
  ClientMetadata,
  ClientTrack,
};


export class ApiClient {
  private static getHostConfig() {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const envBff = getEnv("VITE_DEFAULT_BFF_URL");
    const envTorrent = getEnv("VITE_DEFAULT_TORRENT_URL");
    const envSearch = getEnv("VITE_DEFAULT_SEARCH_URL");
    const envLocked = getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";

    const isLocked = envLocked || hostname === "beta.potok.rip";

    return {
      bff: envBff,
      torrent: envTorrent,
      search: envSearch,
      locked: isLocked,
      profileName: hostname === "beta.potok.rip" ? "Potok Beta" : "Основной профиль"
    };
  }

  private static getDefaultProfiles() {
    const hostConfig = this.getHostConfig();
    return [
      {
        id: "default-profile",
        name: hostConfig.profileName,
        gatewayURL: hostConfig.bff,
        torrentGoURL: hostConfig.torrent,
        searchEngineURL: hostConfig.search,
        torrentGoAuthEnabled: false,
        torrentGoAuthLogin: "",
      }
    ];
  }

  public static get isSettingsLocked(): boolean {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    return getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true" || hostname === "beta.potok.rip";
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
  private static _cachedTorrentGoURL?: string;

  public static invalidateCache(): void {
    this._cachedBaseURL = undefined;
    this._cachedSearchEngineURL = undefined;
    this._cachedTorrentGoURL = undefined;
  }

  public static get baseURL(): string {
    if (!this._cachedBaseURL) {
      const bffEnv = getEnv("VITE_DEFAULT_BFF_URL");
      let url = "";
      if (this.isSettingsLocked && bffEnv) {
        url = bffEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", defaultProfs[0].id);
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
      const searchEnv = getEnv("VITE_DEFAULT_SEARCH_URL");
      let url = "";
      if (this.isSettingsLocked) {
        url = searchEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", defaultProfs[0].id);
        const profiles = Storage.get<any[]>("connectionProfiles", defaultProfs);
        const active = profiles.find((p) => p.id === activeID);
        url = active?.searchEngineURL || "";
      }
      this._cachedSearchEngineURL = this.ensureAbsoluteURL(url);
    }
    return this._cachedSearchEngineURL;
  }

  public static get torrentGoURL(): string {
    if (!this._cachedTorrentGoURL) {
      const torrentEnv = getEnv("VITE_DEFAULT_TORRENT_URL");
      let url = "";
      if (this.isSettingsLocked) {
        url = torrentEnv;
      } else {
        const defaultProfs = this.getDefaultProfiles();
        const activeID = Storage.get<string | null>("activeProfileID", defaultProfs[0].id);
        const profiles = Storage.get<any[]>("connectionProfiles", defaultProfs);
        const active = profiles.find((p) => p.id === activeID);
        url = active?.torrentGoURL || "";
      }
      this._cachedTorrentGoURL = this.ensureAbsoluteURL(url);
    }
    return this._cachedTorrentGoURL;
  }

  public static get headers(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
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
    const absolute = this.ensureAbsoluteURL(url);
    const normalized = absolute.replace(/\/$/, "");
    const res = await fetch(`${normalized}/api/handshake`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Handshake failed: ${res.status}`);
    return res.json();
  }

  public static async pingHealth(url: string, path: string, useCors: boolean = false): Promise<ServiceInfo> {
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

  public static async fetchHomeFeed(): Promise<HomeResponse> {
    const res = await fetch(`${this.baseURL}/api/media/home?language=ru`, {
      headers: this.headers,
    });
    return this.handleResponse<HomeResponse>(res, "Failed to fetch home feed");
  }

  public static async searchMedia(query: string): Promise<MediaCard[]> {
    const res = await fetch(`${this.baseURL}/api/media/search?query=${encodeURIComponent(query)}`, {
      headers: this.headers,
    });
    return this.handleResponse<MediaCard[]>(res, "Search failed");
  }

  public static async fetchMediaDetails(mediaType: string, id: number): Promise<MediaCard> {
    const res = await fetch(`${this.baseURL}/api/media/detail/${mediaType}/${id}`, {
      headers: this.headers,
    });
    return this.handleResponse<MediaCard>(res, "Failed to fetch details");
  }

  public static async fetchTvSeason(tvId: number, seasonNumber: number): Promise<TvSeason> {
    const res = await fetch(`${this.baseURL}/api/media/tmdb/tv/${tvId}/season/${seasonNumber}`, {
      headers: this.headers,
    });
    return this.handleResponse<TvSeason>(res, "Failed to fetch season details");
  }

  public static getHashFromMagnet(magnet: string): string | null {
    if (!magnet) return null;
    try {
      const match = magnet.match(/xt=urn:btih:([^&/]+)/i);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  }

  public static async getTorrentOverride(hash: string): Promise<TorrentOverride | null> {
    try {
      const res = await fetch(`${this.baseURL}/api/torrents/overrides/${hash.toLowerCase()}`, {
        headers: this.headers,
      });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  public static async getBatchOverrides(hashes: string[]): Promise<Record<string, TorrentOverride>> {
    if (hashes.length === 0) return {};
    try {
      const res = await fetch(`${this.baseURL}/api/torrents/overrides/batch`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(hashes),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    // Fallback to fetching single overrides concurrently in parallel
    const result: Record<string, TorrentOverride> = {};
    const uniqueHashes = Array.from(new Set(hashes.map(h => h.toLowerCase())));
    
    await Promise.all(
      uniqueHashes.map(async (hash) => {
        try {
          const over = await this.getTorrentOverride(hash);
          if (over) {
            result[hash] = over;
          }
        } catch {
          // Ignore failed single fetch
        }
      })
    );
    return result;
  }

  public static async searchTorrents(request: TorrentSearchRequest): Promise<{ results: TorrentSearchResult[] }> {
    const searchUrl = this.searchEngineURL.trim();
    if (!searchUrl) {
      throw new Error("Адрес поисковика торрентов не настроен.");
    }
    let normalized = searchUrl;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    const res = await fetch(`${normalized}/api/v1/torrents/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new ApiError(`Torrent search failed (Status ${res.status})`, res.status, errorText);
    }
    const data = await res.json();
    const results: TorrentSearchResult[] = data.results || [];
    
    // Gather all unique hashes from search results
    const hashes = results
      .map(t => this.getHashFromMagnet(t.magnetUri || "") || this.getHashFromMagnet(t.link || ""))
      .filter((h): h is string => !!h);

    // Fetch all overrides in a single batch request!
    const overrides = await this.getBatchOverrides(hashes);

    // Map overrides to matching torrent items
    const enriched = results.map(torrent => {
      const hash = this.getHashFromMagnet(torrent.magnetUri || "") || this.getHashFromMagnet(torrent.link || "");
      if (hash && overrides[hash.toLowerCase()]) {
        return { ...torrent, override: overrides[hash.toLowerCase()] };
      }
      return torrent;
    });

    return { results: enriched };
  }

  public static async getTorrentFiles(request: TorrentFilesRequest): Promise<{ hash: string; items: TorrentFileItem[] }> {
    const tgUrl = this.torrentGoURL.trim();
    if (!tgUrl) {
      throw new Error("Адрес торрент-плеера не настроен.");
    }
    let normalized = tgUrl.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    const res = await fetch(`${normalized}/api/torrent/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    return this.handleResponse<{ hash: string; items: TorrentFileItem[] }>(res, "Failed to get torrent files");
  }

  public static async deleteTorrent(hash: string): Promise<void> {
    const tgUrl = this.torrentGoURL.trim();
    if (!tgUrl) return;
    let normalized = tgUrl.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    await fetch(`${normalized}/api/torrent/${hash.toLowerCase()}`, {
      method: "DELETE",
    }).catch(() => {
      // Safe fallback
    });
  }

  public static async saveTorrentOverride(hash: string, season: number, episodeOffset: number): Promise<void> {
    const res = await fetch(`${this.baseURL}/api/torrents/overrides`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        hash,
        override: {
          season,
          episodeOffset
        }
      }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new ApiError(`Failed to save override (Status ${res.status})`, res.status, errorText);
    }
  }

  public static async getStreamUrl(request: StreamUrlRequest): Promise<{ streamUrl: string }> {
    const tgUrl = this.torrentGoURL.trim();
    if (!tgUrl) {
      throw new Error("Адрес торрент-плеера не настроен.");
    }
    let normalized = tgUrl.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `http://${normalized}`;
    }
    const hash = request.hash;
    const fileId = request.index ?? request.id;
    let url = `${normalized}/stream/${hash}/${fileId}`;
    if (request.originalPath) {
      const parts = request.originalPath.split("/");
      const filename = parts[parts.length - 1];
      if (filename) {
        url += `/${encodeURIComponent(filename)}`;
      }
    }
    return { streamUrl: url };
  }

  public static async saveInfuseItemAndGetStreams(request: InfuseSaveRequest): Promise<string[]> {
    const res = await fetch(`${this.baseURL}/api/infuse/save`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(request),
    });
    return this.handleResponse<string[]>(res, "Failed to save to library");
  }

  public static async syncTraktAction(path: string, request: TraktSyncRequest): Promise<void> {
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
    const res = await fetch(`${this.baseURL}/api/media/row/${rowId}?page=${page}`, {
      headers: this.headers,
    });
    return this.handleResponse<MediaCard[]>(res, `Failed to fetch media row: ${rowId}`);
  }

  public static async fetchLibraryCategory(category: string): Promise<MediaCard[]> {
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
      const cards = await Promise.all(
        unique.map(async (e) => {
          try {
            return await this.fetchMediaDetails(e.mediaType, Number(e.tmdbId));
          } catch {
            return null;
          }
        })
      );
      return cards.filter((c): c is MediaCard => c !== null);
    }
    return [];
  }

  public static async getStreamMetadata(hash: string, fileId: string | number): Promise<ClientMetadata | null> {
    try {
      const cleanBase = this.torrentGoURL.replace(/\/+$/, "");
      const res = await fetch(`${cleanBase}/api/torrent/metadata/${hash.toLowerCase()}/${fileId}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }
}

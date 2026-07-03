import { getEnv } from "./EnvService";
import { Storage } from "./StorageService";
import type { ConnectionProfile } from "../network/ApiTypes";

const TORRENT_PLAYER_KEY = "potok_plugin:scoped:potok-torrents:playerServerURL";
const TORRENT_LEGACY_KEY = "potok_plugin:scoped:potok-torrents:torrentGoURL";

function ensureAbsoluteURL(url: string): string {
  if (!url) return "";
  const normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    return `http://${normalized}`;
  }
  return normalized;
}

class SettingsServiceImpl {
  isSettingsLocked(): boolean {
    return getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";
  }

  getDefaultProfiles(): ConnectionProfile[] {
    return [
      {
        id: "default-profile",
        name: "Main profile",
        gatewayURL: getEnv("VITE_DEFAULT_BFF_URL"),
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      },
    ];
  }

  getConnectionProfiles(): ConnectionProfile[] {
    return Storage.get<ConnectionProfile[]>("connectionProfiles", this.getDefaultProfiles());
  }

  getActiveProfileId(): string | null {
    const profiles = this.getConnectionProfiles();
    const stored = Storage.get<string | null>("activeProfileID", null);
    if (stored && profiles.some((p) => p.id === stored)) return stored;
    if (this.isSettingsLocked()) return this.getDefaultProfiles()[0].id;
    return profiles[0]?.id ?? null;
  }

  getActiveProfile(): ConnectionProfile | null {
    const id = this.getActiveProfileId();
    return this.getConnectionProfiles().find((p) => p.id === id) ?? null;
  }

  getGatewayUrl(): string {
    const bff = getEnv("VITE_DEFAULT_BFF_URL");
    if (this.isSettingsLocked() && bff) return ensureAbsoluteURL(bff);
    return ensureAbsoluteURL(this.getActiveProfile()?.gatewayURL || bff || "");
  }

  getSearchEngineUrl(): string {
    if (this.isSettingsLocked()) return "";
    return ensureAbsoluteURL(this.getActiveProfile()?.searchEngineURL || "");
  }

  getPlayerServerUrl(): string {
    let url = this.isSettingsLocked() ? "" : (this.getActiveProfile()?.playerServerURL || "");
    if (!url) {
      try {
        if (typeof localStorage !== "undefined") {
          url = localStorage.getItem(TORRENT_PLAYER_KEY) || localStorage.getItem(TORRENT_LEGACY_KEY) || "";
        } else {
          url = Storage.get<string>(TORRENT_PLAYER_KEY, "") || Storage.get<string>(TORRENT_LEGACY_KEY, "") || "";
        }
      } catch {
        /* storage unavailable */
      }
    }
    return ensureAbsoluteURL(url);
  }

  getToken(): string | null {
    return Storage.get<string | null>("potokToken", null);
  }

  getLanguage(): string {
    return Storage.get<string>("language", "en");
  }

  getSyncStrategy(): string {
    return Storage.get<string>("syncStrategy", "none");
  }

  snapshot(): Record<string, unknown> {
    return {
      activeProfileID: this.getActiveProfileId(),
      connectionProfiles: this.getConnectionProfiles(),
      language: this.getLanguage(),
      potokToken: this.getToken(),
      syncStrategy: this.getSyncStrategy(),
      netDebug: Storage.get<boolean>("netDebug", true),
      [TORRENT_PLAYER_KEY]: Storage.get<string>(TORRENT_PLAYER_KEY, ""),
      [TORRENT_LEGACY_KEY]: Storage.get<string>(TORRENT_LEGACY_KEY, ""),
    };
  }

  applySnapshot(snapshot: Record<string, unknown>): void {
    for (const key in snapshot) {
      Storage.set(key, snapshot[key]);
    }
  }
}

export const SettingsService = new SettingsServiceImpl();

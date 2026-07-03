import { getEnv } from "./EnvService";
import { Storage } from "./StorageService";
import type { ConnectionProfile } from "../network/ApiTypes";

const TORRENT_PLAYER_KEY = "potok_plugin:scoped:potok-torrents:playerServerURL";
const TORRENT_LEGACY_KEY = "potok_plugin:scoped:potok-torrents:torrentGoURL";

interface LegacyProfile {
  id?: string;
  name?: string;
  gatewayURL?: string;
  playerServerURL?: string;
  searchEngineURL?: string;
  playerServerAuthEnabled?: boolean;
  playerServerAuthLogin?: string;
  torrServerURL?: string;
  torrServerAuthEnabled?: boolean;
  torrServerAuthLogin?: string;
  [key: string]: any;
}

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
    const raw = Storage.get<LegacyProfile[]>("connectionProfiles", this.getDefaultProfiles() as LegacyProfile[]);
    let migrated = false;
    const cleanProfiles = raw.map((p: LegacyProfile): ConnectionProfile => {
      const copy = { ...p };
      const defaultBff = getEnv("VITE_DEFAULT_BFF_URL");
      if (copy.id === "default-profile" && !copy.gatewayURL && defaultBff) {
        copy.gatewayURL = defaultBff;
        migrated = true;
      }
      if ("torrServerURL" in copy && copy.torrServerURL) {
        if (!copy.playerServerURL) {
          copy.playerServerURL = copy.torrServerURL;
        }
        delete copy.torrServerURL;
        migrated = true;
      }
      if ("torrServerAuthEnabled" in copy && copy.torrServerAuthEnabled !== undefined) {
        if (copy.playerServerAuthEnabled === undefined) {
          copy.playerServerAuthEnabled = copy.torrServerAuthEnabled;
        }
        delete copy.torrServerAuthEnabled;
        migrated = true;
      }
      if ("torrServerAuthLogin" in copy && copy.torrServerAuthLogin !== undefined) {
        if (copy.playerServerAuthLogin === undefined) {
          copy.playerServerAuthLogin = copy.torrServerAuthLogin;
        }
        delete copy.torrServerAuthLogin;
        migrated = true;
      }

      const tgUrlKey = "tor" + "rentGoURL";
      const tgAuthEnabledKey = "tor" + "rentGoAuthEnabled";
      const tgAuthLoginKey = "tor" + "rentGoAuthLogin";

      if (tgUrlKey in copy && copy[tgUrlKey]) {
        if (!copy.playerServerURL) {
          copy.playerServerURL = copy[tgUrlKey];
        }
        delete copy[tgUrlKey];
        migrated = true;
      }
      if (tgAuthEnabledKey in copy && copy[tgAuthEnabledKey] !== undefined) {
        if (copy.playerServerAuthEnabled === undefined) {
          copy.playerServerAuthEnabled = copy[tgAuthEnabledKey];
        }
        delete copy[tgAuthEnabledKey];
        migrated = true;
      }
      if (tgAuthLoginKey in copy && copy[tgAuthLoginKey] !== undefined) {
        if (copy.playerServerAuthLogin === undefined) {
          copy.playerServerAuthLogin = copy[tgAuthLoginKey];
        }
        delete copy[tgAuthLoginKey];
        migrated = true;
      }

      return {
        id: copy.id || `profile-${Date.now()}`,
        name: copy.name || "Unnamed Profile",
        gatewayURL: copy.gatewayURL || "",
        playerServerURL: copy.playerServerURL || "",
        searchEngineURL: copy.searchEngineURL || "",
        playerServerAuthEnabled: !!copy.playerServerAuthEnabled,
        playerServerAuthLogin: copy.playerServerAuthLogin || "",
      };
    });

    if (migrated) {
      Storage.set("connectionProfiles", cleanProfiles);
    }
    return cleanProfiles;
  }

  addConnectionProfile(profile: Omit<ConnectionProfile, "id">): ConnectionProfile[] | null {
    const current = this.getConnectionProfiles();
    if (current.length >= 5) {
      return null;
    }
    const newProfile = { ...profile, id: `profile-${Date.now()}` };
    const updated = [...current, newProfile];
    Storage.set("connectionProfiles", updated);
    this.setActiveProfileId(newProfile.id);
    return updated;
  }

  updateConnectionProfile(profile: ConnectionProfile): ConnectionProfile[] {
    const current = this.getConnectionProfiles();
    const updated = current.map((p) => (p.id === profile.id ? profile : p));
    Storage.set("connectionProfiles", updated);
    return updated;
  }

  deleteConnectionProfile(id: string): { updated: ConnectionProfile[]; nextActiveId: string | null } {
    const current = this.getConnectionProfiles();
    const updated = current.filter((p) => p.id !== id);
    Storage.set("connectionProfiles", updated);

    const currentActive = Storage.get<string | null>("activeProfileID", null);
    let nextActiveId: string | null = currentActive;

    if (currentActive === id) {
      nextActiveId = updated.length > 0 ? updated[0].id : null;
      if (nextActiveId) {
        Storage.set("activeProfileID", nextActiveId);
      } else {
        Storage.remove("activeProfileID");
      }
    }
    return { updated, nextActiveId };
  }

  setActiveProfileId(id: string): void {
    Storage.set("activeProfileID", id);
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

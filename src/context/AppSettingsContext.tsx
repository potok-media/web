/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { useHUD } from "./HUDContext";
import { ApiClient } from "../network/ApiClient";
import type { ServiceStatus, ConnectionProfile, PotokUser } from "../network/ApiTypes";
import { webSocketClient } from "../network/WebSocketClient";
import { AuthApiClient } from "../network/AuthApiClient";
import { getEnv } from "../utils/EnvService";
import { logger } from "../utils/logger";
import { useSystemWake } from "../hooks/useSystemWake";
import { PlatformManager } from "../utils/PlatformManager";

export type ConnectionState = "checking" | "connected" | "offline" | "setupRequired";

export interface PlaylistItem {
  season: number;
  episode: number;
  title?: string;
  streamUrl: string;
  streamType?: "m3u8" | "mp4" | "dash";
  audios?: { name: string; url: string }[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
}

export interface ActivePlayback {
  streamUrl: string;
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  mediaType: "movie" | "tv";
  id: number;
  season?: number;
  episode?: number;
  streamHash?: string;
  streamType?: "m3u8" | "mp4" | "dash";
  audios?: { name: string; url: string }[];
  audioNames?: string[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  playlist?: PlaylistItem[];
  playlistIndex?: number;
}

// --------------------------------------------------
// Settings Context & Provider
// --------------------------------------------------
export interface SettingsContextType {
  connectionProfiles: ConnectionProfile[];
  activeProfileID: string | null;
  accentTheme: string;
  defaultPlayer: string;
  uiFontScale: number;
  isSettingsLocked: boolean;
  developerMode: boolean;
  disableHttpProxy: boolean;
  directPlay: boolean;
  tvLightMode: boolean;
  selectProfile: (id: string) => void;
  addProfile: (profile: Omit<ConnectionProfile, "id">) => void;
  deleteProfile: (id: string) => void;
  updateProfile: (profile: ConnectionProfile) => void;
  setAccentTheme: (theme: string) => void;
  setDefaultPlayer: (player: string) => void;
  setUiFontScale: (scale: number) => void;
  setDeveloperMode: (val: boolean) => void;
  setDisableHttpProxy: (val: boolean) => void;
  setDirectPlay: (val: boolean) => void;
  setTvLightMode: (val: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getHostConfig = () => {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const envBff = getEnv("VITE_DEFAULT_BFF_URL");
  const envLocked = getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";

  const isLocked = envLocked || hostname === "beta.potok.rip";

  return {
    bff: envBff,
    search: "",
    locked: isLocked,
    profileName: hostname === "beta.potok.rip" ? "Potok Beta" : "Основной профиль"
  };
};

const hostConfig = getHostConfig();

const defaultProfiles: ConnectionProfile[] = [
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>(() => {
    const raw = Storage.get<LegacyProfile[]>("connectionProfiles", defaultProfiles as LegacyProfile[]);
    let migrated = false;
    const cleanProfiles = raw.map((p: LegacyProfile): ConnectionProfile => {
      const copy = { ...p };
      if (copy.id === "default-profile" && !copy.gatewayURL && hostConfig.bff) {
        copy.gatewayURL = hostConfig.bff;
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
  });

  const [activeProfileID, setActiveProfileID] = useState<string | null>(() => 
    Storage.get<string | null>("activeProfileID", hostConfig.bff ? defaultProfiles[0].id : null)
  );
  const [accentTheme, _setAccentTheme] = useState<string>(() => 
    Storage.get<string>("accentTheme", "nordicFrost")
  );
  const [defaultPlayer, _setDefaultPlayer] = useState<string>(() => 
    Storage.get<string>("defaultPlayer", "native")
  );
  const [uiFontScale, _setUiFontScale] = useState<number>(() =>
    // TV defaults bigger than desktop for 10-foot viewing (matches the "Стандарт" preset);
    // PlatformManager.init applies the same default synchronously pre-paint.
    Storage.get<number>("uiFontScale", PlatformManager.isTV() ? 1.4 : 1.0)
  );
  const [developerMode, _setDeveloperMode] = useState<boolean>(() => 
    Storage.get<boolean>("developerMode", false)
  );
  const [disableHttpProxy, _setDisableHttpProxy] = useState<boolean>(() => 
    Storage.get<boolean>("disableHttpProxy", true)
  );
  const [directPlay, _setDirectPlay] = useState<boolean>(() =>
    Storage.get<boolean>("directPlay", true)
  );
  const [tvLightMode, _setTvLightMode] = useState<boolean>(() =>
    Storage.get<boolean>("tvLightMode", false)
  );

  const isSettingsLocked = hostConfig.locked;

  useEffect(() => {
    // Inject cached custom themes from localStorage immediately to avoid FOUC
    try {
      const cached = localStorage.getItem("potok_custom_themes");
      if (cached) {
        const themesList = JSON.parse(cached);
        if (Array.isArray(themesList)) {
          let styleTag = document.getElementById("potok-plugin-custom-themes") as HTMLStyleElement;
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "potok-plugin-custom-themes";
            document.head.appendChild(styleTag);
          }
          let cssContent = "";
          themesList.forEach((theme: any) => {
            if (theme && theme.id && theme.variables) {
              const rules = Object.entries(theme.variables)
                .map(([key, val]) => `  ${key}: ${val};`)
                .join("\n");
              cssContent += `html[data-theme="${theme.id}"] {\n${rules}\n}\n`;
            }
          });
          styleTag.textContent = cssContent;
        }
      }
    } catch (e) {
      logger.error("[AppSettingsContext] Failed to load cached custom themes:", e);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", accentTheme);
  }, [accentTheme]);

  // "Light mode" flattens residual depth/effects on TV (see tv.css). The class is
  // mirrored on first paint by PlatformManager; this keeps it in sync with the toggle.
  useEffect(() => {
    document.body.classList.toggle("tv-light", tvLightMode);
  }, [tvLightMode]);

  useEffect(() => {
    const scale = uiFontScale || 1.0;
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    // One scale lever for every platform: bump the root font-size. The whole UI is rem-based, so
    // this enlarges it crisply at the panel's native resolution (TV presets just pick a bigger
    // multiplier than desktop — see AccessibilitySettings). No transform/zoom of the canvas.
    // On TV, normalize by viewport width so the UI is the same PHYSICAL size on panels that report
    // different CSS viewports (Apple TV ≈1920 vs Android TV ≈960–1280). See tvFontFactor.
    const factor = PlatformManager.isTV() ? PlatformManager.tvFontFactor() : 1;
    document.documentElement.style.setProperty("font-size", `${scale * factor * 100}%`);
  }, [uiFontScale]);

  const selectProfile = useCallback((id: string) => {
    Storage.set("activeProfileID", id);
    setActiveProfileID(id);
    ApiClient.invalidateCache();
  }, []);

  const addProfile = useCallback((profile: Omit<ConnectionProfile, "id">) => {
    const newProfile = { ...profile, id: `profile-${Date.now()}` };
    setConnectionProfiles((prev) => {
      const updated = [...prev, newProfile];
      Storage.set("connectionProfiles", updated);
      return updated;
    });
    ApiClient.invalidateCache();
    selectProfile(newProfile.id);
  }, [selectProfile]);

  const deleteProfile = useCallback((id: string) => {
    setConnectionProfiles((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      Storage.set("connectionProfiles", updated);
      return updated;
    });
    ApiClient.invalidateCache();
    setActiveProfileID((currentActive) => {
      if (currentActive === id) {
        const raw = Storage.get<ConnectionProfile[]>("connectionProfiles", defaultProfiles);
        const nextActive = raw.length > 0 ? raw[0].id : null;
        if (nextActive) {
          Storage.set("activeProfileID", nextActive);
        } else {
          Storage.remove("activeProfileID");
        }
        return nextActive;
      }
      return currentActive;
    });
  }, []);

  const updateProfile = useCallback((profile: ConnectionProfile) => {
    setConnectionProfiles((prev) => {
      const updated = prev.map((p) => (p.id === profile.id ? profile : p));
      Storage.set("connectionProfiles", updated);
      return updated;
    });
    ApiClient.invalidateCache();
  }, []);

  const setAccentTheme = useCallback((theme: string) => {
    Storage.set("accentTheme", theme);
    _setAccentTheme(theme);
  }, []);

  const setDefaultPlayer = useCallback((player: string) => {
    Storage.set("defaultPlayer", player);
    _setDefaultPlayer(player);
  }, []);

  const setUiFontScale = useCallback((scale: number) => {
    Storage.set("uiFontScale", scale);
    // On TV the effect above re-applies the transform stage live (no reload needed).
    _setUiFontScale(scale);
  }, []);

  const setDeveloperMode = useCallback((val: boolean) => {
    Storage.set("developerMode", val);
    _setDeveloperMode(val);
  }, []);

  const setDisableHttpProxy = useCallback((val: boolean) => {
    Storage.set("disableHttpProxy", val);
    _setDisableHttpProxy(val);
  }, []);

  const setDirectPlay = useCallback((val: boolean) => {
    Storage.set("directPlay", val);
    _setDirectPlay(val);
  }, []);

  const setTvLightMode = useCallback((val: boolean) => {
    Storage.set("tvLightMode", val);
    _setTvLightMode(val);
  }, []);

  const value = useMemo(() => ({
    connectionProfiles,
    activeProfileID,
    accentTheme,
    defaultPlayer,
    uiFontScale,
    isSettingsLocked,
    developerMode,
    disableHttpProxy,
    directPlay,
    tvLightMode,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
    setAccentTheme,
    setDefaultPlayer,
    setUiFontScale,
    setDeveloperMode,
    setDisableHttpProxy,
    setDirectPlay,
    setTvLightMode,
  }), [
    connectionProfiles,
    activeProfileID,
    accentTheme,
    defaultPlayer,
    uiFontScale,
    isSettingsLocked,
    developerMode,
    disableHttpProxy,
    directPlay,
    tvLightMode,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
    setAccentTheme,
    setDefaultPlayer,
    setUiFontScale,
    setDeveloperMode,
    setDisableHttpProxy,
    setDirectPlay,
    setTvLightMode,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("../utils/worker/DataWorkerBridge").then(({ DataWorkerBridge }) => {
        DataWorkerBridge.syncSettings();
      });
    }
  }, [activeProfileID, connectionProfiles]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

// --------------------------------------------------
// Auth Context & Provider
// --------------------------------------------------
export interface AuthContextType {
  potokToken: string | null;
  potokUser: PotokUser | null;
  multiUserMode: boolean;
  syncStrategy: string;
  traktToken: string | null;
  login: (token: string, user: PotokUser) => void;
  logout: () => void;
  setMultiUserMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSyncStrategy: (strategy: string) => void;
  setTraktToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [potokToken, setPotokToken] = useState<string | null>(() => 
    Storage.get<string | null>("potokToken", null)
  );
  const [potokUser, setPotokUser] = useState<PotokUser | null>(() => 
    Storage.get<PotokUser | null>("potokUser", null)
  );
  const [multiUserMode, setMultiUserMode] = useState<boolean>(() =>
    Storage.get<boolean>("multiUserMode", false)
  );
  const [syncStrategy, setSyncStrategyState] = useState<string>(() =>
    Storage.get<string>("syncStrategy", "none")
  );
  const [traktToken, setTraktTokenState] = useState<string | null>(() =>
    Storage.get<string | null>("traktAccessToken", null)
  );

  const setSyncStrategy = useCallback((strategy: string) => {
    Storage.set("syncStrategy", strategy);
    setSyncStrategyState(strategy);
  }, []);

  const setTraktToken = useCallback((token: string | null) => {
    if (token) {
      Storage.set("traktAccessToken", token);
    } else {
      Storage.remove("traktAccessToken");
    }
    setTraktTokenState(token);
  }, []);

  const login = useCallback((token: string, user: PotokUser) => {
    Storage.set("potokToken", token);
    Storage.set("potokUser", user);
    const strategy = user.syncStrategy || "none";
    const tToken = user.traktAccessToken || null;
    Storage.set("syncStrategy", strategy);
    if (tToken) {
      Storage.set("traktAccessToken", tToken);
    } else {
      Storage.remove("traktAccessToken");
    }
    setPotokToken(token);
    setPotokUser(user);
    setSyncStrategyState(strategy);
    setTraktTokenState(tToken);
  }, []);

  const logout = useCallback(() => {
    Storage.remove("potokToken");
    Storage.remove("potokUser");
    Storage.remove("syncStrategy");
    Storage.remove("traktAccessToken");
    Storage.remove("multiUserMode");
    setPotokToken(null);
    setPotokUser(null);
    setMultiUserMode(false);
    setSyncStrategyState("none");
    setTraktTokenState(null);
  }, []);

  useEffect(() => {
    if (potokToken) {
      AuthApiClient.getMe()
        .then((user) => {
          Storage.set("potokUser", user);
          setPotokUser(user);
          const strategy = user.syncStrategy || "none";
          const tToken = user.traktAccessToken || null;
          Storage.set("syncStrategy", strategy);
          if (tToken) {
            Storage.set("traktAccessToken", tToken);
          } else {
            Storage.remove("traktAccessToken");
          }
          setSyncStrategyState(strategy);
          setTraktTokenState(tToken);
        })
        .catch((err) => {
          logger.error("Failed to fetch current user profile:", err);
          if (err instanceof Error && err.message === "Unauthorized") {
            logout();
          }
        });
    }
  }, [potokToken, logout]);

  const value = useMemo(() => ({
    potokToken,
    potokUser,
    multiUserMode,
    syncStrategy,
    traktToken,
    login,
    logout,
    setMultiUserMode,
    setSyncStrategy,
    setTraktToken,
  }), [
    potokToken,
    potokUser,
    multiUserMode,
    syncStrategy,
    traktToken,
    login,
    logout,
    setMultiUserMode,
    setSyncStrategy,
    setTraktToken,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("../utils/worker/DataWorkerBridge").then(({ DataWorkerBridge }) => {
        DataWorkerBridge.syncSettings();
      });
    }
  }, [potokToken, traktToken, syncStrategy]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --------------------------------------------------
// Connection Health Context & Provider
// --------------------------------------------------
export interface ConnectionHealthContextType {
  connectionState: ConnectionState;
  checkConnection: (options?: { silent?: boolean }) => Promise<void>;
}

export interface ConnectionLatencyContextType {
  bffLatencyMs: number;
  services: ServiceStatus;
}

export const ConnectionHealthContext = createContext<ConnectionHealthContextType | undefined>(undefined);
export const ConnectionLatencyContext = createContext<ConnectionLatencyContextType | undefined>(undefined);

export const ConnectionHealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connectionProfiles, activeProfileID, isSettingsLocked } = useSettings();
  const { setMultiUserMode } = useAuth();

  const activeProfile = useMemo(() => {
    return connectionProfiles.find((p) => p.id === activeProfileID) || null;
  }, [connectionProfiles, activeProfileID]);

  const gatewayURL = useMemo(() => {
    return isSettingsLocked 
      ? getEnv("VITE_DEFAULT_BFF_URL") 
      : (activeProfile?.gatewayURL || "");
  }, [isSettingsLocked, activeProfile]);

  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [bffLatencyMs, setBffLatencyMs] = useState<number>(-1);
  const [services, setServices] = useState<ServiceStatus>({
    bff: { configured: true, online: false },
    playerServer: { configured: false, online: false },
    searchEngine: { configured: false, online: false },
  });

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const connectionStateRef = useRef<ConnectionState>("checking");
  const checkConnectionRef = useRef<((options?: { silent?: boolean }) => Promise<void>) | null>(null);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const stopPingTimer = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const startPingTimer = useCallback(() => {
    if (pingIntervalRef.current) return;
    if (!activeProfileID || (!isSettingsLocked && (!activeProfile || !activeProfile.gatewayURL))) {
      return;
    }
    pingIntervalRef.current = setInterval(async () => {
      const currentGateway = ApiClient.baseURL;
      if (!currentGateway) return;

      if (navigator.onLine === false) {
        logger.warn("Network interface is down (navigator.onLine = false). Skipping health check.");
        return;
      }

      try {
        const bff = await ApiClient.pingHealth(currentGateway, "/api/health/bff", true);
        const search = { configured: false, online: false };
        const playerSrv = { configured: false, online: false };

        if (!bff.online) {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 3) {
            setConnectionState("offline");
          }
        } else {
          consecutiveFailuresRef.current = 0;
          setServices({
            bff,
            searchEngine: search,
            playerServer: playerSrv,
          });
          const currentState = connectionStateRef.current;
          if (currentState === "offline") {
            if (checkConnectionRef.current) {
              checkConnectionRef.current({ silent: true });
            }
          } else {
            setConnectionState("connected");
          }
        }
      } catch {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 3) {
          setConnectionState("offline");
        }
      }
    }, 30000);
  }, [activeProfileID, isSettingsLocked, activeProfile]);

  const checkConnection = useCallback(async (options?: { silent?: boolean }) => {
    stopPingTimer();
    const currentGateway = ApiClient.baseURL;
    if (!currentGateway || !activeProfileID || (!isSettingsLocked && (!activeProfile || !activeProfile.gatewayURL))) {
      setConnectionState("setupRequired");
      setBffLatencyMs(-1);
      return;
    }

    if (!options?.silent) {
      setConnectionState("checking");
    }

    try {
      const handshake = await ApiClient.performHandshake(currentGateway);
      const isMultiUser = handshake.multiUserMode ?? false;
      Storage.set("multiUserMode", isMultiUser);
      setMultiUserMode(isMultiUser);
      
      const bff = await ApiClient.pingHealth(currentGateway, "/api/health/bff", true);
      const search = { configured: false, online: false };
      const playerSrv = { configured: false, online: false };

      const currentServices = { bff, searchEngine: search, playerServer: playerSrv };
      setBffLatencyMs(bff.latencyMs ?? -1);
      setServices(currentServices);
      setConnectionState("connected");
      consecutiveFailuresRef.current = 0;
      
      startPingTimer();
    } catch {
      setBffLatencyMs(-1);
      setConnectionState("offline");
      startPingTimer();
    }
  }, [activeProfileID, isSettingsLocked, activeProfile, setMultiUserMode, startPingTimer, stopPingTimer]);

  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  }, [checkConnection]);

  useSystemWake((log) => {
    logger.log(`[AppSettings] System wake event: drift = ${log.driftMs}ms, online = ${log.navigatorOnline}`);
    if (log.navigatorOnline) {
      if (checkConnectionRef.current) {
        checkConnectionRef.current({ silent: true });
      }
    }
  });

  useEffect(() => {
    logger.log(`[AppSettings] WebSocket lifecycle effect triggered. ActiveProfileID: ${activeProfileID}, Configured gatewayURL: ${gatewayURL}`);
    if (activeProfileID && gatewayURL) {
      webSocketClient.startListening(gatewayURL);
    } else {
      webSocketClient.stopListening();
    }

    const unsubConnected = webSocketClient.subscribe("connected", () => {
      if (checkConnectionRef.current) {
        checkConnectionRef.current();
      }
    });

    const unsubOffline = webSocketClient.subscribe("offline", () => {
      setBffLatencyMs(-1);
    });

    return () => {
      unsubConnected();
      unsubOffline();
      webSocketClient.stopListening();
    };
  }, [activeProfileID, gatewayURL]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkConnection();
    }, 0);
    return () => {
      clearTimeout(timer);
      stopPingTimer();
    };
  }, [activeProfileID, gatewayURL, checkConnection, stopPingTimer]);

  const healthValue = useMemo(() => ({
    connectionState,
    checkConnection,
  }), [
    connectionState,
    checkConnection,
  ]);

  const latencyValue = useMemo(() => ({
    bffLatencyMs,
    services,
  }), [
    bffLatencyMs,
    services,
  ]);

  return (
    <ConnectionHealthContext.Provider value={healthValue}>
      <ConnectionLatencyContext.Provider value={latencyValue}>
        {children}
      </ConnectionLatencyContext.Provider>
    </ConnectionHealthContext.Provider>
  );
};

export const useConnectionHealth = () => {
  const context = useContext(ConnectionHealthContext);
  if (!context) throw new Error("useConnectionHealth must be used within ConnectionHealthProvider");
  return context;
};

export const useConnectionLatency = () => {
  const context = useContext(ConnectionLatencyContext);
  if (!context) throw new Error("useConnectionLatency must be used within ConnectionLatencyProvider");
  return context;
};

// --------------------------------------------------
// Playback Context & Provider
// --------------------------------------------------
export interface PlaybackContextType {
  activePlayback: ActivePlayback | null;
  playVideo: (playback: ActivePlayback) => void;
  stopVideo: () => void;
}

export const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

function transliterate(word: string): string {
  const converter: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E', 'Ж': 'Zh', 'З': 'Z',
    'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R',
    'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ь': '', 'Ы': 'Y', 'Ъ': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };

  return word.split('').map(char => converter[char] !== undefined ? converter[char] : char).join('');
}

function cleanStreamUrlForExternalPlayer(playback: ActivePlayback): string {
  let url = playback.streamUrl;

  // 1. Remove all query parameters (like ?remux=true)
  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    url = url.substring(0, queryIndex);
  }

  // 2. Extract original filename and path base
  const lastSlashIndex = url.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return url;
  }

  const basePath = url.substring(0, lastSlashIndex + 1);
  const originalFilename = url.substring(lastSlashIndex + 1);

  // Extract extension
  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = extMatch ? extMatch[1] : "mp4";

  // 3. Construct clean filename: {EnglishTitle}.{SnEn}.{tmdb-nnn}.{ext}
  let englishTitle = playback.englishTitle || playback.originalTitle || playback.title || "";
  
  // Clean englishTitle: replace spaces and special characters with dots
  englishTitle = transliterate(englishTitle);
  englishTitle = englishTitle
    .replace(/[^a-zA-Z0-9\s.\-_]/g, "") // Keep alphanumeric, spaces, dots, hyphens, underscores
    .trim()
    .replace(/[\s\-_]+/g, ".") // Replace spaces/hyphens/underscores with dots
    .replace(/\.+/g, "."); // Clean double dots

  // Remove leading/trailing dots
  englishTitle = englishTitle.replace(/^\.+|\.+$/g, "");

  if (!englishTitle) {
    englishTitle = "Video";
  }

  // Format {SnEn}
  let snEn = "";
  if (playback.mediaType === "tv") {
    const s = playback.season !== undefined ? playback.season : 1;
    const e = playback.episode !== undefined ? playback.episode : 1;
    const sStr = String(s).padStart(2, "0");
    const eStr = String(e).padStart(2, "0");
    snEn = `S${sStr}E${eStr}.`;
  }

  // Format {tmdb-nnn}
  const tmdbStr = playback.id ? `{tmdb-${playback.id}}.` : "";

  // Combine: {EnglishTitle}.{SnEn}.{tmdb-nnn}.{ext}
  const cleanFilename = `${englishTitle}.${snEn}${tmdbStr}${ext}`;

  return basePath + cleanFilename;
}

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { defaultPlayer } = useSettings();
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();

  const [activePlayback, setActivePlayback] = useState<ActivePlayback | null>(null);

  const playVideo = useCallback((playback: ActivePlayback) => {
    // Intercept with PlatformManager for native player shells
    if (PlatformManager.playVideo(playback)) {
      logger.log("[PlaybackProvider] Playback handled natively by PlatformManager.");
      return;
    }

    if (defaultPlayer === "infuse") {
      try {
        const cleanedUrl = cleanStreamUrlForExternalPlayer(playback);
        const encodedUrl = encodeURIComponent(cleanedUrl);
        const triggerUrl = `infuse://x-callback-url/play?url=${encodedUrl}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = triggerUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 100);
        showHUD("success", "Открываем в Infuse!");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        showHUD("error", "Ошибка Infuse: " + errorMsg);
      }
    } else {
      setActivePlayback(playback);
    }
  }, [defaultPlayer, showHUD]);

  const stopVideo = useCallback(() => {
    setActivePlayback(null);
  }, []);

  // Declarative state reset on auth changes with non-cascading schedule to satisfy strict linting rules
  useEffect(() => {
    const timer = setTimeout(() => {
      setActivePlayback(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [potokToken]);

  const value = useMemo(() => ({
    activePlayback,
    playVideo,
    stopVideo,
  }), [
    activePlayback,
    playVideo,
    stopVideo,
  ]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error("usePlayback must be used within PlaybackProvider");
  return context;
};

// --------------------------------------------------
// Unified Backward-Compatible Hook & Nested Provider
// --------------------------------------------------
export interface AppSettingsContextType extends SettingsContextType, AuthContextType, ConnectionHealthContextType, PlaybackContextType {}

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ConnectionHealthProvider>
          <PlaybackProvider>
            {children}
          </PlaybackProvider>
        </ConnectionHealthProvider>
      </AuthProvider>
    </SettingsProvider>
  );
};

export const useAppSettings = () => {
  const settings = useContext(SettingsContext);
  const auth = useContext(AuthContext);
  const health = useContext(ConnectionHealthContext);
  const playback = useContext(PlaybackContext);

  if (!settings || !auth || !health || !playback) {
    throw new Error("useAppSettings must be used within nested Providers: Settings -> Auth -> ConnectionHealth -> Playback");
  }

  return {
    ...settings,
    ...auth,
    ...health,
    ...playback,
  };
};

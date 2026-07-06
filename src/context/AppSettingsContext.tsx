/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { SettingsService } from "../utils/SettingsService";
import { useHUD } from "./HUDContext";
import { ApiClient } from "../network/ApiClient";
import type { ServiceStatus, ConnectionProfile, PotokUser } from "../network/ApiTypes";
import type { SDKSubtitleInfo, SDKPlaybackSession, SDKThumbnails } from "../sdk/src/types";
import { webSocketClient } from "../network/WebSocketClient";
import { AuthApiClient } from "../network/AuthApiClient";
import { getEnv } from "../utils/EnvService";
import { logger } from "../utils/logger";
import { useSystemWake } from "../hooks/useSystemWake";
import { PlatformManager } from "../utils/PlatformManager";
import { i18n, LANGUAGE_STORAGE_KEY } from "../i18n";

export type ConnectionState = "checking" | "connected" | "offline" | "setupRequired";

export interface PlaylistItem {
  // `id` = the source's per-episode identity (e.g. torrent file index). Kept so the player can lazily
  // re-fetch a FRESH playback descriptor (session/subtitles/audios) for the next episode instead of
  // reusing a stale pre-built URL. Playlist items stay lean — the full descriptor comes from the re-fetch.
  id?: string;
  season: number;
  episode: number;
  title?: string;
  streamUrl: string;
  streamType?: "m3u8" | "mp4" | "hls" | "dash";
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
  // Explicit source file index — supplied by the plugin so the player never parses it out of the URL.
  fileIndex?: string;
  streamType?: "m3u8" | "mp4" | "hls" | "dash";
  audios?: { name: string; url: string }[];
  audioNames?: string[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  // Backend presence session (keepalive/stop URLs) supplied by the plugin. The player drives it as a
  // generic heartbeat and never hardcodes a backend URL. Absent → no session heartbeat.
  session?: SDKPlaybackSession;
  playlist?: PlaylistItem[];
  playlistIndex?: number;
  subtitles?: SDKSubtitleInfo[];
  duration?: number;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  // Generic scrub-preview thumbnails (plugin-supplied). Player builds preview URLs from the template.
  thumbnails?: SDKThumbnails;
  // Stream warms up (torrent/live) → player shows the loading/progress overlay until first frame.
  requiresBuffering?: boolean;
}

// --------------------------------------------------
// Settings Context & Provider
// --------------------------------------------------
export interface SettingsContextType {
  connectionProfiles: ConnectionProfile[];
  activeProfileID: string | null;
  activeGatewayURL: string;
  accentTheme: string;
  defaultPlayer: string;
  bannerQuality: string;
  uiFontScale: number;
  language: string;
  isSettingsLocked: boolean;
  developerMode: boolean;
  disableHttpProxy: boolean;
  directPlay: boolean;
  selectProfile: (id: string) => void;
  addProfile: (profile: Omit<ConnectionProfile, "id">) => void;
  deleteProfile: (id: string) => void;
  updateProfile: (profile: ConnectionProfile) => void;
  setAccentTheme: (theme: string) => void;
  setDefaultPlayer: (player: string) => void;
  setBannerQuality: (quality: string) => void;
  setUiFontScale: (scale: number) => void;
  setLanguage: (lng: string) => void;
  setDeveloperMode: (val: boolean) => void;
  setDisableHttpProxy: (val: boolean) => void;
  setDirectPlay: (val: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getHostConfig = () => {
  const envBff = getEnv("VITE_DEFAULT_BFF_URL");
  const isLocked = getEnv("VITE_BLOCK_SETTINGS_INPUT") === "true";

  return {
    bff: envBff,
    search: "",
    locked: isLocked,
    profileName: "Main profile"
  };
};

const hostConfig = getHostConfig();

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>(() => {
    return SettingsService.getConnectionProfiles();
  });

  const [activeProfileID, setActiveProfileID] = useState<string | null>(() => {
    return SettingsService.getActiveProfileId();
  });
  const [accentTheme, _setAccentTheme] = useState<string>(() => 
    Storage.get<string>("accentTheme", "nordicFrost")
  );
  const [defaultPlayer, _setDefaultPlayer] = useState<string>(() =>
    Storage.get<string>("defaultPlayer", "native")
  );
  const [bannerQuality, _setBannerQuality] = useState<string>(() =>
    Storage.get<string>("bannerQuality", "auto")
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
  // i18n already resolved the active language at startup (persisted → navigator → env);
  // mirror it into React state so the selector reflects/drives it.
  const [language, _setLanguage] = useState<string>(() => i18n.language);
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
    SettingsService.setActiveProfileId(id);
    setActiveProfileID(id);
    ApiClient.invalidateCache();
  }, []);

  const addProfile = useCallback((profile: Omit<ConnectionProfile, "id">) => {
    const updated = SettingsService.addConnectionProfile(profile);
    if (updated) {
      setConnectionProfiles(updated);
      setActiveProfileID(SettingsService.getActiveProfileId());
      ApiClient.invalidateCache();
    }
  }, []);

  const deleteProfile = useCallback((id: string) => {
    const { updated, nextActiveId } = SettingsService.deleteConnectionProfile(id);
    setConnectionProfiles(updated);
    setActiveProfileID(nextActiveId);
    ApiClient.invalidateCache();
  }, []);

  const updateProfile = useCallback((profile: ConnectionProfile) => {
    const updated = SettingsService.updateConnectionProfile(profile);
    setConnectionProfiles(updated);
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

  const setBannerQuality = useCallback((quality: string) => {
    Storage.set("bannerQuality", quality);
    _setBannerQuality(quality);
  }, []);

  const setUiFontScale = useCallback((scale: number) => {
    Storage.set("uiFontScale", scale);
    // On TV the effect above re-applies the transform stage live (no reload needed).
    _setUiFontScale(scale);
  }, []);

  const setLanguage = useCallback((lng: string) => {
    Storage.set(LANGUAGE_STORAGE_KEY, lng);
    _setLanguage(lng);
    // Drives i18next (UI strings re-render) and the <html lang/dir> listener; plugin
    // iframes are notified separately (Step 9).
    i18n.changeLanguage(lng);
    // TMDB-sourced data (titles/overviews/genres/logos) is fetched per-language, so drop
    // the cached responses (main + data worker) — subsequent fetches use the new language.
    ApiClient.invalidateCache();
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

  const activeGatewayURL = useMemo(() => {
    const active = connectionProfiles.find((p) => p.id === activeProfileID);
    return active?.gatewayURL || "";
  }, [connectionProfiles, activeProfileID]);

  useEffect(() => {
    logger.log(
      `[settings] locked=${ApiClient.isSettingsLocked} profiles=${connectionProfiles.length} active=${activeProfileID} baseURL=${ApiClient.baseURL || "(empty)"}`
    );
  }, []);

  const value = useMemo(() => ({
    connectionProfiles,
    activeProfileID,
    activeGatewayURL,
    accentTheme,
    defaultPlayer,
    bannerQuality,
    uiFontScale,
    language,
    isSettingsLocked,
    developerMode,
    disableHttpProxy,
    directPlay,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
    setAccentTheme,
    setDefaultPlayer,
    setBannerQuality,
    setUiFontScale,
    setLanguage,
    setDeveloperMode,
    setDisableHttpProxy,
    setDirectPlay,
  }), [
    connectionProfiles,
    activeProfileID,
    activeGatewayURL,
    accentTheme,
    defaultPlayer,
    bannerQuality,
    uiFontScale,
    language,
    isSettingsLocked,
    developerMode,
    disableHttpProxy,
    directPlay,
    selectProfile,
    addProfile,
    deleteProfile,
    updateProfile,
    setAccentTheme,
    setDefaultPlayer,
    setBannerQuality,
    setUiFontScale,
    setLanguage,
    setDeveloperMode,
    setDisableHttpProxy,
    setDirectPlay,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("../utils/worker/DataWorkerBridge").then(({ DataWorkerBridge }) => {
        DataWorkerBridge.syncSettings();
      });
    }
  }, [activeProfileID, connectionProfiles, language]);

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
  traktConnected: boolean;
  login: (token: string, user: PotokUser) => void;
  logout: () => void;
  setMultiUserMode: React.Dispatch<React.SetStateAction<boolean>>;
  setSyncStrategy: (strategy: string) => void;
  setTraktConnected: (connected: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfileID, activeGatewayURL } = useSettings();
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
  const [traktConnected, setTraktConnectedState] = useState<boolean>(() =>
    Storage.get<PotokUser | null>("potokUser", null)?.traktConnected ?? false
  );

  const setSyncStrategy = useCallback((strategy: string) => {
    Storage.set("syncStrategy", strategy);
    setSyncStrategyState(strategy);
  }, []);

  const setTraktConnected = useCallback((connected: boolean) => {
    setTraktConnectedState(connected);
  }, []);

  const login = useCallback((token: string, user: PotokUser) => {
    Storage.set("potokToken", token);
    Storage.set("potokUser", user);
    const strategy = user.syncStrategy || "none";
    Storage.set("syncStrategy", strategy);
    setPotokToken(token);
    setPotokUser(user);
    setSyncStrategyState(strategy);
    setTraktConnectedState(user.traktConnected ?? false);
  }, []);

  const logout = useCallback(() => {
    Storage.remove("potokToken");
    Storage.remove("potokUser");
    Storage.remove("syncStrategy");
    Storage.remove("multiUserMode");
    setPotokToken(null);
    setPotokUser(null);
    setMultiUserMode(false);
    setSyncStrategyState("none");
    setTraktConnectedState(false);
  }, []);

  useEffect(() => {
    if (potokToken) {
      AuthApiClient.getMe()
        .then((user) => {
          Storage.set("potokUser", user);
          setPotokUser(user);
          const strategy = user.syncStrategy || "none";
          Storage.set("syncStrategy", strategy);
          setSyncStrategyState(strategy);
          setTraktConnectedState(user.traktConnected ?? false);
        })
        .catch((err) => {
          logger.error("Failed to fetch current user profile:", err);
          if (err instanceof Error && err.message === "Unauthorized") {
            logout();
          }
        });
    }
  }, [potokToken, logout, activeProfileID, activeGatewayURL]);

  const value = useMemo(() => ({
    potokToken,
    potokUser,
    multiUserMode,
    syncStrategy,
    traktConnected,
    login,
    logout,
    setMultiUserMode,
    setSyncStrategy,
    setTraktConnected,
  }), [
    potokToken,
    potokUser,
    multiUserMode,
    syncStrategy,
    traktConnected,
    login,
    logout,
    setMultiUserMode,
    setSyncStrategy,
    setTraktConnected,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("../utils/worker/DataWorkerBridge").then(({ DataWorkerBridge }) => {
        DataWorkerBridge.syncSettings();
      });
    }
  }, [potokToken, syncStrategy]);

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
  /** Non-destructive patch of the LIVE playback (e.g. deferred subtitles/duration arriving after the player
   *  opened). Guarded by `match` so a late patch for a since-replaced video is dropped. Does not reload. */
  enrichPlayback: (patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => void;
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

  const enrichPlayback = useCallback((patch: Partial<ActivePlayback>, match?: { streamHash?: string; fileIndex?: string }) => {
    setActivePlayback((prev) => {
      if (!prev) return prev;
      // Drop a late patch that belongs to a video the user already switched away from.
      if (match && ((match.streamHash !== undefined && match.streamHash !== prev.streamHash) ||
                    (match.fileIndex !== undefined && match.fileIndex !== prev.fileIndex))) {
        return prev;
      }
      return { ...prev, ...patch };
    });
  }, []);

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
    enrichPlayback,
    stopVideo,
  }), [
    activePlayback,
    playVideo,
    enrichPlayback,
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

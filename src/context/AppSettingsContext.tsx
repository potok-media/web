import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Storage } from "../utils/StorageService";
import { ApiClient } from "../network/ApiClient";
import type { ServiceStatus, ConnectionProfile, PotokUser } from "../network/ApiTypes";
import { webSocketClient } from "../network/WebSocketClient";
import { AuthApiClient } from "../network/AuthApiClient";
import { getEnv } from "../utils/EnvService";

export type ConnectionState = "checking" | "connected" | "offline" | "setupRequired";

export interface ActivePlayback {
  streamUrl: string;
  title: string;
  mediaType: "movie" | "tv";
  id: number;
  season?: number;
  episode?: number;
  torrentHash: string;
}

interface AppSettingsContextType {
  connectionState: ConnectionState;
  bffLatencyMs: number;
  services: ServiceStatus;
  connectionProfiles: ConnectionProfile[];
  activeProfileID: string | null;
  accentTheme: string;
  defaultPlayer: string;
  uiFontScale: number;
  potokToken: string | null;
  potokUser: PotokUser | null;
  multiUserMode: boolean;
  isSettingsLocked: boolean;
  activePlayback: ActivePlayback | null;
  
  checkConnection: () => Promise<void>;
  selectProfile: (id: string) => void;
  addProfile: (profile: Omit<ConnectionProfile, "id">) => void;
  deleteProfile: (id: string) => void;
  updateProfile: (profile: ConnectionProfile) => void;
  setAccentTheme: (theme: string) => void;
  setDefaultPlayer: (player: string) => void;
  setUiFontScale: (scale: number) => void;
  login: (token: string, user: PotokUser) => void;
  logout: () => void;
  playVideo: (playback: ActivePlayback) => void;
  stopVideo: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const getHostConfig = () => {
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
};

const hostConfig = getHostConfig();

const defaultProfiles: ConnectionProfile[] = [
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

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>(() => {
    const raw = Storage.get<any[]>("connectionProfiles", defaultProfiles);
    let migrated = false;
    const cleanProfiles = raw.map((p: any) => {
      const copy = { ...p };
      if ("torrServerURL" in copy) {
        if (!copy.torrentGoURL) {
          copy.torrentGoURL = copy.torrServerURL;
        }
        delete copy.torrServerURL;
        migrated = true;
      }
      if ("torrServerAuthEnabled" in copy) {
        if (copy.torrentGoAuthEnabled === undefined) {
          copy.torrentGoAuthEnabled = copy.torrServerAuthEnabled;
        }
        delete copy.torrServerAuthEnabled;
        migrated = true;
      }
      if ("torrServerAuthLogin" in copy) {
        if (copy.torrentGoAuthLogin === undefined) {
          copy.torrentGoAuthLogin = copy.torrServerAuthLogin;
        }
        delete copy.torrServerAuthLogin;
        migrated = true;
      }
      return copy as ConnectionProfile;
    });
    if (migrated) {
      Storage.set("connectionProfiles", cleanProfiles);
    }
    return cleanProfiles;
  });
  const [activeProfileID, setActiveProfileID] = useState<string | null>(() => 
    Storage.get<string | null>("activeProfileID", defaultProfiles[0].id)
  );
  const [accentTheme, _setAccentTheme] = useState<string>(() => 
    Storage.get<string>("accentTheme", "nordicFrost")
  );
  const [defaultPlayer, _setDefaultPlayer] = useState<string>(() => 
    Storage.get<string>("defaultPlayer", "native")
  );
  const [uiFontScale, _setUiFontScale] = useState<number>(() => 
    Storage.get<number>("uiFontScale", 1.0)
  );

  const [activePlayback, setActivePlayback] = useState<ActivePlayback | null>(null);

  const playVideo = (playback: ActivePlayback) => {
    setActivePlayback(playback);
  };

  const stopVideo = () => {
    setActivePlayback(null);
  };

  const isSettingsLocked = hostConfig.locked;

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;

  const gatewayURL = isSettingsLocked 
    ? getEnv("VITE_DEFAULT_BFF_URL") 
    : (activeProfile?.gatewayURL || "");

  const [connectionState, setConnectionState] = useState<ConnectionState>("checking");
  const [bffLatencyMs, setBffLatencyMs] = useState<number>(-1);
  const [services, setServices] = useState<ServiceStatus>({
    bff: { configured: true, online: false },
    torrentGo: { configured: true, online: false },
    searchEngine: { configured: true, online: false },
  });

  const pingIntervalRef = useRef<any>(null);
  const consecutiveFailuresRef = useRef<number>(0);
  const connectionStateRef = useRef<ConnectionState>("checking");
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const [potokToken, setPotokToken] = useState<string | null>(() => 
    Storage.get<string | null>("potokToken", null)
  );
  const [potokUser, setPotokUser] = useState<PotokUser | null>(() => 
    Storage.get<PotokUser | null>("potokUser", null)
  );
  const [multiUserMode, setMultiUserMode] = useState<boolean>(() =>
    Storage.get<boolean>("multiUserMode", false)
  );

  const login = (token: string, user: PotokUser) => {
    Storage.set("potokToken", token);
    Storage.set("potokUser", user);
    if (user.syncStrategy) {
      Storage.set("syncStrategy", user.syncStrategy);
    }
    if (user.traktAccessToken) {
      Storage.set("traktAccessToken", user.traktAccessToken);
    } else {
      Storage.remove("traktAccessToken");
    }
    setPotokToken(token);
    setPotokUser(user);
  };

  const logout = () => {
    Storage.remove("potokToken");
    Storage.remove("potokUser");
    Storage.remove("syncStrategy");
    Storage.remove("traktAccessToken");
    Storage.remove("multiUserMode");
    setPotokToken(null);
    setPotokUser(null);
    setMultiUserMode(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", accentTheme);
  }, [accentTheme]);

  useEffect(() => {
    const scale = uiFontScale || 1.0;
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    document.documentElement.style.setProperty("font-size", `${scale * 100}%`);
    if (document.body) {
      document.body.style.zoom = "";
    }
  }, [uiFontScale]);

  const checkConnection = async () => {
    stopPingTimer();
    const currentGateway = ApiClient.baseURL;
    if (!currentGateway) {
      setConnectionState("setupRequired");
      setBffLatencyMs(-1);
      return;
    }

    setConnectionState("checking");

    try {
      const handshake = await ApiClient.performHandshake(currentGateway);
      const isMultiUser = handshake.multiUserMode ?? false;
      Storage.set("multiUserMode", isMultiUser);
      setMultiUserMode(isMultiUser);
      
      const currentTorrent = ApiClient.torrentGoURL;
      const currentSearch = ApiClient.searchEngineURL;

      const bff = await ApiClient.pingHealth(currentGateway, "/api/health/bff", true);
      const search = currentSearch ? await ApiClient.pingHealth(currentSearch, "/health") : { configured: false, online: false };
      const torrent = currentTorrent ? await ApiClient.pingHealth(currentTorrent, "/health") : { configured: false, online: false };

      const currentServices = { bff, searchEngine: search, torrentGo: torrent };
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
  };

  const startPingTimer = () => {
    if (pingIntervalRef.current) return;
    pingIntervalRef.current = setInterval(async () => {
      const currentGateway = ApiClient.baseURL;
      if (!currentGateway) return;

      // Skip ping if browser reports no network connection at all (sleep/wake/tab hibernation protection)
      if (navigator.onLine === false) {
        console.warn("Network interface is down (navigator.onLine = false). Skipping health check.");
        return;
      }

      try {
        const currentTorrent = ApiClient.torrentGoURL;
        const currentSearch = ApiClient.searchEngineURL;

        const bff = await ApiClient.pingHealth(currentGateway, "/api/health/bff", true);
        const search = currentSearch ? await ApiClient.pingHealth(currentSearch, "/health") : { configured: false, online: false };
        const torrent = currentTorrent ? await ApiClient.pingHealth(currentTorrent, "/health") : { configured: false, online: false };

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
            torrentGo: torrent,
          });
          const currentState = connectionStateRef.current;
          if (currentState === "offline") {
            setConnectionState("checking");
            setTimeout(() => {
              checkConnection();
            }, 0);
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
  };

  const stopPingTimer = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    console.log(`[AppSettings] WebSocket lifecycle effect triggered. ActiveProfileID: ${activeProfileID}, Configured gatewayURL: ${gatewayURL}`);
    if (activeProfileID && gatewayURL) {
      webSocketClient.startListening(gatewayURL);
    } else {
      webSocketClient.stopListening();
    }

    const unsubConnected = webSocketClient.subscribe("connected", () => {
      // При переподключении сокета всегда запускаем реальную проверку здоровья API.
      // Это полностью исключает ложные срабатывания (например, при перехвате сокета сервером Vite HMR на порту 3000).
      checkConnection();
    });

    const unsubOffline = webSocketClient.subscribe("offline", () => {
      setBffLatencyMs(-1);
    });

    return () => {
      unsubConnected();
      unsubOffline();
    };
  }, [activeProfileID, gatewayURL]);

  useEffect(() => {
    checkConnection();
    return () => stopPingTimer();
  }, [activeProfileID, gatewayURL]);

  useEffect(() => {
    if (potokToken) {
      AuthApiClient.getMe()
        .then((user) => {
          Storage.set("potokUser", user);
          setPotokUser(user);
          if (user.syncStrategy) {
            Storage.set("syncStrategy", user.syncStrategy);
          }
          if (user.traktAccessToken) {
            Storage.set("traktAccessToken", user.traktAccessToken);
          } else {
            Storage.remove("traktAccessToken");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch current user profile:", err);
          if (err instanceof Error && err.message === "Unauthorized") {
            logout();
          }
        });
    }
  }, [potokToken]);

  const selectProfile = (id: string) => {
    Storage.set("activeProfileID", id);
    setActiveProfileID(id);
    ApiClient.invalidateCache();
  };

  const addProfile = (profile: Omit<ConnectionProfile, "id">) => {
    const newProfile = { ...profile, id: `profile-${Date.now()}` };
    const updated = [...connectionProfiles, newProfile];
    Storage.set("connectionProfiles", updated);
    setConnectionProfiles(updated);
    ApiClient.invalidateCache();
    selectProfile(newProfile.id);
  };

  const deleteProfile = (id: string) => {
    const updated = connectionProfiles.filter((p) => p.id !== id);
    Storage.set("connectionProfiles", updated);
    setConnectionProfiles(updated);
    ApiClient.invalidateCache();
    if (activeProfileID === id && updated.length > 0) {
      selectProfile(updated[0].id);
    }
  };

  const updateProfile = (profile: ConnectionProfile) => {
    const updated = connectionProfiles.map((p) => (p.id === profile.id ? profile : p));
    Storage.set("connectionProfiles", updated);
    setConnectionProfiles(updated);
    ApiClient.invalidateCache();
    if (activeProfileID === profile.id) {
      checkConnection();
    }
  };

  const setAccentTheme = (theme: string) => {
    Storage.set("accentTheme", theme);
    _setAccentTheme(theme);
  };

  const setDefaultPlayer = (player: string) => {
    Storage.set("defaultPlayer", player);
    _setDefaultPlayer(player);
  };

  const setUiFontScale = (scale: number) => {
    Storage.set("uiFontScale", scale);
    _setUiFontScale(scale);
  };

  return (
    <AppSettingsContext.Provider
      value={{
        connectionState,
        bffLatencyMs,
        services,
        connectionProfiles,
        activeProfileID,
        accentTheme,
        defaultPlayer,
        uiFontScale,
        potokToken,
        potokUser,
        multiUserMode,
        isSettingsLocked,
        activePlayback,
        checkConnection,
        selectProfile,
        addProfile,
        deleteProfile,
        updateProfile,
        setAccentTheme,
        setDefaultPlayer,
        setUiFontScale,
        login,
        logout,
        playVideo,
        stopVideo,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return context;
};

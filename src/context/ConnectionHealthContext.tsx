/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { ApiClient } from "../network/ApiClient";
import type { ServiceStatus } from "../network/ApiTypes";
import { webSocketClient } from "../network/WebSocketClient";
import { getEnv } from "../utils/EnvService";
import { logger } from "../utils/logger";
import { useSystemWake } from "../hooks/useSystemWake";
import { useSettings } from "./SettingsContext";
import { useAuth } from "./AuthContext";
import type { ConnectionState } from "./playbackTypes";

export type { ConnectionState };

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
  const { setMultiUserMode, setTelegramAuth } = useAuth();

  const activeProfile = useMemo(
    () => connectionProfiles.find((p) => p.id === activeProfileID) || null,
    [connectionProfiles, activeProfileID],
  );

  const gatewayURL = useMemo(
    () => (isSettingsLocked ? getEnv("VITE_DEFAULT_BFF_URL") : activeProfile?.gatewayURL || ""),
    [isSettingsLocked, activeProfile],
  );

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
          setServices({ bff, searchEngine: search, playerServer: playerSrv });
          const currentState = connectionStateRef.current;
          if (currentState === "offline") {
            checkConnectionRef.current?.({ silent: true });
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

  const checkConnection = useCallback(
    async (options?: { silent?: boolean }) => {
      stopPingTimer();
      const currentGateway = ApiClient.baseURL;
      if (
        !currentGateway ||
        !activeProfileID ||
        (!isSettingsLocked && (!activeProfile || !activeProfile.gatewayURL))
      ) {
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
        setTelegramAuth(handshake.telegramAuthEnabled ?? false, handshake.telegramBotUsername ?? null);

        const bff = await ApiClient.pingHealth(currentGateway, "/api/health/bff", true);
        const search = { configured: false, online: false };
        const playerSrv = { configured: false, online: false };

        setBffLatencyMs(bff.latencyMs ?? -1);
        setServices({ bff, searchEngine: search, playerServer: playerSrv });
        setConnectionState("connected");
        consecutiveFailuresRef.current = 0;
        startPingTimer();
      } catch {
        setBffLatencyMs(-1);
        setConnectionState("offline");
        startPingTimer();
      }
    },
    [activeProfileID, isSettingsLocked, activeProfile, setMultiUserMode, setTelegramAuth, startPingTimer, stopPingTimer],
  );

  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  }, [checkConnection]);

  useSystemWake((log) => {
    logger.log(
      `[AppSettings] System wake event: drift = ${log.driftMs}ms, online = ${log.navigatorOnline}`,
    );
    if (log.navigatorOnline) {
      checkConnectionRef.current?.({ silent: true });
    }
  });

  useEffect(() => {
    if (activeProfileID && gatewayURL) {
      webSocketClient.startListening(gatewayURL);
    } else {
      webSocketClient.stopListening();
    }

    const unsubConnected = webSocketClient.subscribe("connected", () => {
      checkConnectionRef.current?.();
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

  const healthValue = useMemo(
    () => ({ connectionState, checkConnection }),
    [connectionState, checkConnection],
  );

  const latencyValue = useMemo(
    () => ({ bffLatencyMs, services }),
    [bffLatencyMs, services],
  );

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
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import type { PotokUser } from "../network/ApiTypes";
import { AuthApiClient } from "../network/AuthApiClient";
import { logger } from "../utils/logger";
import { useSettings } from "./SettingsContext";

export interface AuthContextType {
  potokToken: string | null;
  potokUser: PotokUser | null;
  multiUserMode: boolean;
  telegramAuthEnabled: boolean;
  telegramBotUsername: string | null;
  syncStrategy: string;
  traktConnected: boolean;
  login: (token: string, user: PotokUser) => void;
  logout: () => void;
  setMultiUserMode: React.Dispatch<React.SetStateAction<boolean>>;
  setTelegramAuth: (enabled: boolean, botUsername: string | null) => void;
  updateUser: (user: PotokUser) => void;
  setSyncStrategy: (strategy: string) => void;
  setTraktConnected: (connected: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeProfileID, activeGatewayURL } = useSettings();
  const [potokToken, setPotokToken] = useState<string | null>(() =>
    Storage.get<string | null>("potokToken", null),
  );
  const [potokUser, setPotokUser] = useState<PotokUser | null>(() =>
    Storage.get<PotokUser | null>("potokUser", null),
  );
  const [multiUserMode, setMultiUserMode] = useState<boolean>(() =>
    Storage.get<boolean>("multiUserMode", false),
  );
  const [telegramAuthEnabled, setTelegramAuthEnabled] = useState<boolean>(() =>
    Storage.get<boolean>("telegramAuthEnabled", false),
  );
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(() =>
    Storage.get<string | null>("telegramBotUsername", null),
  );
  const [syncStrategy, setSyncStrategyState] = useState<string>(() =>
    Storage.get<string>("syncStrategy", "none"),
  );
  const [traktConnected, setTraktConnectedState] = useState<boolean>(() =>
    Storage.get<PotokUser | null>("potokUser", null)?.traktConnected ?? false,
  );

  const setSyncStrategy = useCallback((strategy: string) => {
    Storage.set("syncStrategy", strategy);
    setSyncStrategyState(strategy);
  }, []);

  const setTraktConnected = useCallback((connected: boolean) => {
    setTraktConnectedState(connected);
  }, []);

  const setTelegramAuth = useCallback((enabled: boolean, botUsername: string | null) => {
    Storage.set("telegramAuthEnabled", enabled);
    Storage.set("telegramBotUsername", botUsername);
    setTelegramAuthEnabled(enabled);
    setTelegramBotUsername(botUsername);
  }, []);

  const updateUser = useCallback((user: PotokUser) => {
    Storage.set("potokUser", user);
    setPotokUser(user);
    setTraktConnectedState(user.traktConnected ?? false);
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
    if (!potokToken) return;
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
  }, [potokToken, logout, activeProfileID, activeGatewayURL]);

  const value = useMemo(
    () => ({
      potokToken,
      potokUser,
      multiUserMode,
      telegramAuthEnabled,
      telegramBotUsername,
      syncStrategy,
      traktConnected,
      login,
      logout,
      setMultiUserMode,
      setTelegramAuth,
      updateUser,
      setSyncStrategy,
      setTraktConnected,
    }),
    [
      potokToken,
      potokUser,
      multiUserMode,
      telegramAuthEnabled,
      telegramBotUsername,
      syncStrategy,
      traktConnected,
      login,
      logout,
      setTelegramAuth,
      updateUser,
      setSyncStrategy,
      setTraktConnected,
    ],
  );

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
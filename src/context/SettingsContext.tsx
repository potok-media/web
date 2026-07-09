/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { SettingsService } from "../utils/SettingsService";
import { ApiClient } from "../network/ApiClient";
import type { ConnectionProfile } from "../network/ApiTypes";
import { i18n, LANGUAGE_STORAGE_KEY } from "../i18n";
import { useCustomThemesBootstrap } from "../hooks/useCustomThemesBootstrap";
import { hostConfig } from "./settingsHostConfig";

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

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionProfiles, setConnectionProfiles] = useState<ConnectionProfile[]>(() =>
    SettingsService.getConnectionProfiles(),
  );
  const [activeProfileID, setActiveProfileID] = useState<string | null>(() =>
    SettingsService.getActiveProfileId(),
  );
  const [accentTheme, _setAccentTheme] = useState<string>(() =>
    Storage.get<string>("accentTheme", "nordicFrost"),
  );
  const [defaultPlayer, _setDefaultPlayer] = useState<string>(() =>
    Storage.get<string>("defaultPlayer", "native"),
  );
  const [bannerQuality, _setBannerQuality] = useState<string>(() =>
    Storage.get<string>("bannerQuality", "auto"),
  );
  const [uiFontScale, _setUiFontScale] = useState<number>(() =>
    Storage.get<number>("uiFontScale", 1.0),
  );
  const [developerMode, _setDeveloperMode] = useState<boolean>(() =>
    Storage.get<boolean>("developerMode", false),
  );
  const [disableHttpProxy, _setDisableHttpProxy] = useState<boolean>(() =>
    Storage.get<boolean>("disableHttpProxy", true),
  );
  const [directPlay, _setDirectPlay] = useState<boolean>(() =>
    Storage.get<boolean>("directPlay", true),
  );
  const [language, _setLanguage] = useState<string>(() => i18n.language);
  const isSettingsLocked = hostConfig.locked;

  useCustomThemesBootstrap();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", accentTheme);
  }, [accentTheme]);

  useEffect(() => {
    const scale = uiFontScale || 1.0;
    document.documentElement.style.setProperty("--ui-scale", String(scale));
    document.documentElement.style.setProperty("font-size", `${scale * 100}%`);
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
    _setUiFontScale(scale);
  }, []);

  const setLanguage = useCallback((lng: string) => {
    Storage.set(LANGUAGE_STORAGE_KEY, lng);
    _setLanguage(lng);
    i18n.changeLanguage(lng);
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

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

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
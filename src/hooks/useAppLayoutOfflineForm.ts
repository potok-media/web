import React, { useState } from "react";
import { useSettings, useConnectionHealth } from "../context/AppSettingsContext";
import { getEnv } from "../utils/EnvService";

export function useAppLayoutOfflineForm() {
  const { connectionState, checkConnection } = useConnectionHealth();
  const { connectionProfiles, activeProfileID, updateProfile, addProfile } = useSettings();

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;
  const [inputUrl, setInputUrl] = useState(
    activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || "",
  );

  const [prevActiveProfileID, setPrevActiveProfileID] = useState<string | null>(activeProfileID);

  if (activeProfileID !== prevActiveProfileID) {
    setPrevActiveProfileID(activeProfileID);
    setInputUrl(activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || "");
  }

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const targetUrl = inputUrl.trim().replace(/\/$/, "");

    if (activeProfile) {
      updateProfile({
        ...activeProfile,
        gatewayURL: targetUrl,
        playerServerURL: activeProfile.playerServerURL,
        searchEngineURL: activeProfile.searchEngineURL,
      });
    } else {
      addProfile({
        name: "Local BFF",
        gatewayURL: targetUrl,
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      });
    }

    setTimeout(() => {
      checkConnection();
    }, 150);
  };

  return {
    connectionState,
    checkConnection,
    activeProfile,
    inputUrl,
    setInputUrl,
    handleSaveAndConnect,
  };
}
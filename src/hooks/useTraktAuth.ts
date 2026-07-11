import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AuthApiClient } from "../network/AuthApiClient";
import { useHUD } from "../context/useHUD";
import { useAuth } from "../context/AppSettingsContext";
import { ApiError } from "../network/ApiTypes";
import type { TraktProfile, DeviceCodeResponse } from "../network/ApiTypes";

export function useTraktAuth(syncStrategy: string) {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const { traktConnected, setTraktConnected } = useAuth();

  const [traktProfile, setTraktProfile] = useState<TraktProfile | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollTraktToken = async (codeVal: string) => {
    try {
      const data = await AuthApiClient.getTraktToken(codeVal);
      if (data.access_token) {
        setTraktConnected(true);
        setDeviceCode(null);
        showHUD("success", t("hud.traktConnected"));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== "UNAUTHORIZED") {
        setDeviceCode(null);
        showHUD("error", t("hud.codeExpired"));
      }
    }
  };

  const fetchTraktProfileData = async () => {
    setLoadingTrakt(true);
    try {
      const data: TraktProfile = await AuthApiClient.fetchTraktProfile();
      setTraktProfile(data);
    } catch (err) {
      setTraktProfile(null);
      if (err instanceof ApiError && err.status === 401) {
        setTraktConnected(false);
      }
    } finally {
      setLoadingTrakt(false);
    }
  };

  const startTraktAuth = async () => {
    setLoadingTrakt(true);
    try {
      const code: DeviceCodeResponse = await AuthApiClient.getTraktDeviceCode();
      setDeviceCode(code);
    } catch {
      showHUD("error", t("hud.traktCodeError"));
    } finally {
      setLoadingTrakt(false);
    }
  };

  const handleTraktLogout = async () => {
    try {
      await AuthApiClient.traktLogout();
    } catch {
      // Best-effort remote logout; local state is cleared below regardless.
    }
    setTraktConnected(false);
    setTraktProfile(null);
    showHUD("info", t("hud.traktDisconnected"));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showHUD("success", t("hud.codeCopied"));
  };

  const clearTraktState = () => {
    setTraktProfile(null);
    setDeviceCode(null);
  };

  useEffect(() => {
    if (deviceCode) {
      pollingRef.current = setInterval(() => {
        pollTraktToken(deviceCode.device_code);
      }, (deviceCode.interval || 5) * 1000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // Re-arm the poll only when the device code changes; pollTraktToken is re-created per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCode]);

  useEffect(() => {
    if (syncStrategy === "trakt" && traktConnected) {
      fetchTraktProfileData();
    }
    // Fetch only when the strategy/connection changes; fetchTraktProfileData is re-created per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStrategy, traktConnected]);

  return {
    traktProfile,
    deviceCode,
    loadingTrakt,
    startTraktAuth,
    handleTraktLogout,
    setDeviceCode,
    copyToClipboard,
    clearTraktState,
  };
}
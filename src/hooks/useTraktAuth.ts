import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AuthApiClient } from "../network/AuthApiClient";
import { useHUD } from "../context/useHUD";
import { useAuth } from "../context/AppSettingsContext";
import { ApiError } from "../network/ApiTypes";
import type { TraktProfile, DeviceCodeResponse } from "../network/ApiTypes";

const POLL_PENDING_STATUSES = new Set([400, 429]);
const POLL_EXPIRED_STATUSES = new Set([404, 409, 410, 418]);

export function useTraktAuth(syncStrategy: string) {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const { traktConnected, setTraktConnected } = useAuth();

  const [traktProfile, setTraktProfile] = useState<TraktProfile | null>(null);
  const [deviceCode, setDeviceCodeState] = useState<DeviceCodeResponse | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceCodeRef = useRef<DeviceCodeResponse | null>(null);
  const startingAuthRef = useRef(false);

  const setDeviceCode = (code: DeviceCodeResponse | null) => {
    deviceCodeRef.current = code;
    setDeviceCodeState(code);
  };

  const pollTraktToken = async (codeVal: string) => {
    try {
      const data = await AuthApiClient.getTraktToken(codeVal);
      if (data.access_token) {
        setLoadingTrakt(true);
        setTraktConnected(true);
        setDeviceCode(null);
        showHUD("success", t("hud.traktConnected"));
      }
    } catch (err: unknown) {
      if (!(err instanceof ApiError)) return;
      if (POLL_PENDING_STATUSES.has(err.status)) return;
      if (POLL_EXPIRED_STATUSES.has(err.status)) {
        setDeviceCode(null);
        showHUD("error", t("hud.codeExpired"));
      }
    }
  };

  const startTraktAuth = async () => {
    if (deviceCodeRef.current || startingAuthRef.current) return;
    startingAuthRef.current = true;
    setLoadingTrakt(true);
    try {
      const code: DeviceCodeResponse = await AuthApiClient.getTraktDeviceCode();
      setDeviceCode(code);
    } catch {
      showHUD("error", t("hud.traktCodeError"));
    } finally {
      setLoadingTrakt(false);
      startingAuthRef.current = false;
    }
  };

  const fetchTraktProfileData = async () => {
    setLoadingTrakt(true);
    try {
      const data: TraktProfile = await AuthApiClient.fetchTraktProfile();
      setTraktProfile(data);
    } catch (err) {
      setTraktProfile(null);
      if (syncStrategy !== "trakt") return;
      const status = err instanceof ApiError ? err.status : undefined;
      const disconnected = status === 401 || status === 500 || status === undefined;
      if (!disconnected) return;
      setTraktConnected(false);
      await startTraktAuth();
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

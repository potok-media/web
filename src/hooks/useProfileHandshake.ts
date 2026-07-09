import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { useHUD } from "../context/useHUD";

export function normalizeGateway(raw: string): { ok: boolean; url: string; error?: string } {
  let s = raw.trim().replace(/\/+$/, "");
  if (!s) return { ok: false, url: "", error: "profiles.errorEmptyGateway" };
  if (!/^https?:\/\//i.test(s)) {
    const bareHost = s.split("/")[0].split(":")[0];
    const isIpOrLocal = bareHost === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(bareHost);
    s = (isIpOrLocal ? "http://" : "https://") + s;
  }
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    return { ok: false, url: "", error: "profiles.errorInvalidAddressExample" };
  }
  const host = parsed.hostname;
  const isValidHost = host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(".");
  if (!isValidHost) return { ok: false, url: "", error: "profiles.errorInvalidServer" };
  return { ok: true, url: s };
}

export function useProfileHandshake() {
  const { t } = useTranslation("settings");
  const { show: showHUD } = useHUD();

  const checkReachable = useCallback(async (normalizedUrl: string): Promise<boolean> => {
    try {
      await ApiClient.performHandshake(normalizedUrl);
      return true;
    } catch {
      showHUD("error", t("profiles.errorUnreachable"));
      return false;
    }
  }, [showHUD, t]);

  return { checkReachable, normalizeGateway };
}
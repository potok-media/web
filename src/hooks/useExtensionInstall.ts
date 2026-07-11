import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ExtensionManifest, RegisteredExtension } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import { useHUD } from "../context/useHUD";
import { Storage } from "../utils/StorageService";
import { logger } from "../utils/logger";

interface UseExtensionInstallParams {
  extensions: RegisteredExtension[];
  setExtensions: (list: RegisteredExtension[]) => void;
  blacklist: string[];
  setIsLoading: (loading: boolean) => void;
  onInstallClose?: () => void;
}

export function useExtensionInstall({
  extensions,
  setExtensions,
  blacklist,
  setIsLoading,
  onInstallClose,
}: UseExtensionInstallParams) {
  const { t } = useTranslation("extensions");
  const { show: showHUD } = useHUD();
  const [newUrl, setNewUrl] = useState("");
  const [pendingExtension, setPendingExtension] = useState<{ manifest: ExtensionManifest; cleanUrl: string } | null>(null);

  const installExtension = useCallback((manifest: ExtensionManifest, cleanUrl: string) => {
    const updated = [...extensions, { id: manifest.id, url: cleanUrl, enabled: true, manifest }];
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    setNewUrl("");
    onInstallClose?.();
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", t("toast.installed", { name: manifest.name }));
  }, [extensions, setExtensions, showHUD, t, onInstallClose]);

  const installFromUrl = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      const cleanUrl = trimmed.replace(/\/$/, "");
      let fetchUrl = `${cleanUrl}/manifest.json`;
      if (fetchUrl.includes("raw.githubusercontent.com")) {
        const m = fetchUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
        if (m) fetchUrl = `https://cdn.jsdelivr.net/gh/${m[1]}/${m[2]}@${m[3]}/${m[4]}`;
      }
      const manifest: ExtensionManifest = await ApiClient.fetchExtensionManifest(fetchUrl);
      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error(t("errors.invalidManifest"));
      }
      if (blacklist.includes(manifest.id)) {
        throw new Error(t("errors.blacklisted"));
      }
      if (extensions.some((ext) => ext.id === manifest.id)) {
        throw new Error(t("errors.duplicateId"));
      }
      if (manifest.permissions && manifest.permissions.length > 0) {
        setPendingExtension({ manifest, cleanUrl });
        setNewUrl("");
        onInstallClose?.();
      } else {
        installExtension(manifest, cleanUrl);
      }
    } catch (err) {
      logger.error("[useExtensionInstall] Install failed:", err);
      showHUD("error", err instanceof Error ? err.message : t("errors.installGeneric"));
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, t, blacklist, extensions, installExtension, showHUD, onInstallClose]);

  const handleAddExtension = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void installFromUrl(newUrl);
  }, [newUrl, installFromUrl]);

  const confirmPending = useCallback(() => {
    if (!pendingExtension) return;
    installExtension(pendingExtension.manifest, pendingExtension.cleanUrl);
    setPendingExtension(null);
  }, [pendingExtension, installExtension]);

  const dismissPending = useCallback(() => setPendingExtension(null), []);

  return {
    newUrl,
    setNewUrl,
    pendingExtension,
    handleAddExtension,
    installFromUrl,
    confirmPending,
    dismissPending,
  };
}
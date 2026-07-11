import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ExtensionManifest, RegisteredExtension } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import { useHUD } from "../context/useHUD";
import { Storage } from "../utils/StorageService";
import { logger } from "../utils/logger";
import { resolveManifestDisplayName } from "../components/extensions/extensionUiHelpers";
import type { CatalogEntry } from "./useCatalog";

interface PendingExtension {
  manifest: ExtensionManifest;
  cleanUrl: string;
  displayName: string;
}

interface UseExtensionInstallParams {
  extensions: RegisteredExtension[];
  setExtensions: (list: RegisteredExtension[]) => void;
  blacklist: string[];
  catalog: CatalogEntry[];
  setIsLoading: (loading: boolean) => void;
  onInstallClose?: () => void;
}

export function useExtensionInstall({
  extensions,
  setExtensions,
  blacklist,
  catalog,
  setIsLoading,
  onInstallClose,
}: UseExtensionInstallParams) {
  const { t } = useTranslation("extensions");
  const { show: showHUD } = useHUD();
  const [newUrl, setNewUrl] = useState("");
  const [pendingExtension, setPendingExtension] = useState<PendingExtension | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const catalogNameFor = useCallback((manifest: ExtensionManifest) => {
    const entry = catalog.find((c) => c.id === manifest.id);
    return resolveManifestDisplayName(manifest, { catalogName: entry?.name, t });
  }, [catalog, t]);

  const installExtension = useCallback((manifest: ExtensionManifest, cleanUrl: string, displayName: string) => {
    const updated = [...extensions, { id: manifest.id, url: cleanUrl, enabled: true, manifest }];
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    setNewUrl("");
    onInstallClose?.();
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", t("toast.installed", { name: displayName }));
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
      const displayName = catalogNameFor(manifest);
      if (manifest.permissions && manifest.permissions.length > 0) {
        setPendingExtension({ manifest, cleanUrl, displayName });
        setNewUrl("");
        onInstallClose?.();
      } else {
        installExtension(manifest, cleanUrl, displayName);
      }
    } catch (err) {
      logger.error("[useExtensionInstall] Install failed:", err);
      showHUD("error", err instanceof Error ? err.message : t("errors.installGeneric"));
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, t, blacklist, extensions, installExtension, showHUD, onInstallClose, catalogNameFor]);

  const handleAddExtension = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    void installFromUrl(newUrl);
  }, [newUrl, installFromUrl]);

  const confirmPending = useCallback(async () => {
    if (!pendingExtension || isConfirming) return;
    setIsConfirming(true);
    try {
      // Paint the loading state; keep it visible briefly (install is sync, sandbox spin-up follows).
      await Promise.all([
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 450)),
      ]);
      installExtension(
        pendingExtension.manifest,
        pendingExtension.cleanUrl,
        pendingExtension.displayName,
      );
      setPendingExtension(null);
    } finally {
      setIsConfirming(false);
    }
  }, [pendingExtension, isConfirming, installExtension]);

  const dismissPending = useCallback(() => {
    if (isConfirming) return;
    setPendingExtension(null);
  }, [isConfirming]);

  return {
    newUrl,
    setNewUrl,
    pendingExtension,
    isConfirming,
    handleAddExtension,
    installFromUrl,
    confirmPending,
    dismissPending,
  };
}
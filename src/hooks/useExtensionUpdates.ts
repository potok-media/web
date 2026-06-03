import { useState, useEffect, useCallback } from "react";
import type { RegisteredExtension, ExtensionManifest } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import { useHUD } from "../context/HUDContext";
import { Storage } from "../utils/StorageService";

export interface UpdateItem {
  id: string;
  name: string;
  currentVersion: string;
  newVersion: string;
  url: string;
  manifest: ExtensionManifest;
}

// Helper to compare semver versions
export const isNewerVersion = (current: string, remote: string): boolean => {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const cParts = parse(current);
  const rParts = parse(remote);
  for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
    const c = cParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > c) return true;
    if (c > r) return false;
  }
  return false;
};

// Helper to get normalized manifest fetch URL
export const getNormalizedManifestUrl = (baseUrl: string): string => {
  const cleanUrl = baseUrl.trim().replace(/\/$/, "");
  const manifestUrl = `${cleanUrl}/manifest.json`;

  if (manifestUrl.includes("raw.githubusercontent.com")) {
    const match = manifestUrl.match(/githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
    if (match) {
      const [, user, repo, branch, path] = match;
      return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${path}`;
    }
  }
  return manifestUrl;
};

export const useExtensionUpdates = () => {
  const { show: showHUD } = useHUD();
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableUpdates, setAvailableUpdates] = useState<UpdateItem[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const loadExtensions = useCallback(() => {
    try {
      const list = Storage.get<RegisteredExtension[]>("potok_extensions", []);
      setExtensions(list);
    } catch (err) {
      console.error("[useExtensionUpdates] Load failed:", err);
    }
  }, []);

  const handleToggle = useCallback((id: string) => {
    const currentList = Storage.get<RegisteredExtension[]>("potok_extensions", []);
    const updated = currentList.map((ext) => {
      if (ext.id === id) {
        return { ...ext, enabled: !ext.enabled };
      }
      return ext;
    });
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", "Статус расширения успешно изменен");
  }, [showHUD]);

  const handleDelete = useCallback((id: string) => {
    const currentList = Storage.get<RegisteredExtension[]>("potok_extensions", []);
    const updated = currentList.filter((ext) => ext.id !== id);
    Storage.set("potok_extensions", updated);
    setExtensions(updated);
    window.dispatchEvent(new Event("potok_extensions_updated"));
    showHUD("success", "Расширение успешно удалено");
  }, [showHUD]);

  const checkForUpdates = useCallback(async (force = false) => {
    try {
      const lastCheck = Storage.get<number>("potok_extensions_last_check", 0);
      const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
      if (!force && Date.now() - lastCheck < COOLDOWN_MS) {
        return;
      }

      const list = Storage.get<RegisteredExtension[]>("potok_extensions", []);
      if (list.length === 0) return;

      const updates: UpdateItem[] = [];
      // Limit concurrency: check sequentially in background to prevent CDN rate limiting and overloading network
      for (const ext of list) {
        try {
          const fetchUrl = getNormalizedManifestUrl(ext.url);
          // Limit to 5s timeout using AbortSignal.timeout
          const remoteManifest = await ApiClient.fetchExtensionManifest(
            `${fetchUrl}?t=${Date.now()}`,
            AbortSignal.timeout(5000)
          );
          if (remoteManifest.id && remoteManifest.version) {
            if (isNewerVersion(ext.manifest.version, remoteManifest.version)) {
              updates.push({
                id: ext.id,
                name: ext.manifest.name,
                currentVersion: ext.manifest.version,
                newVersion: remoteManifest.version,
                url: ext.url,
                manifest: remoteManifest,
              });
            }
          }
        } catch {
          // Ignore background fetch errors / timeouts
        }
      }
      
      Storage.set("potok_extensions_last_check", Date.now());

      if (updates.length > 0) {
        setAvailableUpdates(updates);
        showHUD("info", `Доступны обновления для ${updates.length} расширений!`);
      }
    } catch (err) {
      console.error("[useExtensionUpdates] Background update check failed:", err);
    }
  }, [showHUD]);

  const handleCheckSingleUpdate = useCallback(async (id: string, url: string) => {
    showHUD("info", "Проверка обновлений для расширения...");
    try {
      const fetchUrl = getNormalizedManifestUrl(url);
      const manifest = await ApiClient.fetchExtensionManifest(
        `${fetchUrl}?t=${Date.now()}`,
        AbortSignal.timeout(8000)
      );

      if (!manifest.id || !manifest.name || !manifest.entrypoint) {
        throw new Error("Неверный формат manifest.json");
      }

      const currentList = Storage.get<RegisteredExtension[]>("potok_extensions", []);
      const currentExt = currentList.find((ext) => ext.id === id);

      if (currentExt && isNewerVersion(currentExt.manifest.version, manifest.version)) {
        setAvailableUpdates((prev) => {
          const filtered = prev.filter((item) => item.id !== id);
          return [
            ...filtered,
            {
              id,
              name: currentExt.manifest.name,
              currentVersion: currentExt.manifest.version,
              newVersion: manifest.version,
              url,
              manifest,
            },
          ];
        });
        setShowUpdateModal(true);
        showHUD("success", `Найдена новая версия v${manifest.version}!`);
      } else {
        showHUD("success", "У вас установлена самая последняя версия расширения");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Ошибка при проверке обновлений";
      console.error("[useExtensionUpdates] Single update check failed:", err);
      showHUD("error", errorMsg);
    }
  }, [showHUD]);

  const triggerSingleUpdate = useCallback(async (id: string, remoteManifest: ExtensionManifest) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      const currentList = Storage.get<RegisteredExtension[]>("potok_extensions", []);
      const updated = currentList.map((ext) => {
        if (ext.id === id) {
          return { ...ext, manifest: remoteManifest };
        }
        return ext;
      });

      Storage.set("potok_extensions", updated);
      setExtensions(updated);
      window.dispatchEvent(new Event("potok_extensions_updated"));

      // Remove from availableUpdates list
      setAvailableUpdates((prev) => prev.filter((item) => item.id !== id));
      
      showHUD("success", `Расширение "${remoteManifest.name}" успешно обновлено!`);
    } catch {
      showHUD("error", "Не удалось обновить расширение");
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [showHUD]);

  const triggerUpdateAll = useCallback(async () => {
    const updatesCopy = [...availableUpdates];
    for (const update of updatesCopy) {
      await triggerSingleUpdate(update.id, update.manifest);
    }
    setShowUpdateModal(false);
  }, [availableUpdates, triggerSingleUpdate]);

  useEffect(() => {
    loadExtensions();
    checkForUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    extensions,
    setExtensions,
    isLoading,
    setIsLoading,
    availableUpdates,
    setAvailableUpdates,
    showUpdateModal,
    setShowUpdateModal,
    updatingIds,
    loadExtensions,
    handleToggle,
    handleDelete,
    checkForUpdates,
    handleCheckSingleUpdate,
    triggerSingleUpdate,
    triggerUpdateAll,
  };
};

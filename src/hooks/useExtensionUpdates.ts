import { useState, useEffect, useCallback } from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { useHUD } from "../context/useHUD";
import { Storage } from "../utils/StorageService";
import { logger } from "../utils/logger";

export const useExtensionUpdates = () => {
  const { show: showHUD } = useHUD();
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadExtensions = useCallback(() => {
    try {
      const list = Storage.get<RegisteredExtension[]>("potok_extensions", []);
      setExtensions(list);
    } catch (err) {
      logger.error("[useExtensionUpdates] Load failed:", err);
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

  useEffect(() => {
    loadExtensions();
  }, [loadExtensions]);

  return {
    extensions,
    setExtensions,
    isLoading,
    setIsLoading,
    handleToggle,
    handleDelete,
  };
};

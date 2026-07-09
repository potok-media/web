import { useEffect, useState } from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { logger } from "../utils/logger";

export function useSettingsExtensions() {
  const [extensions, setExtensions] = useState<RegisteredExtension[]>(() => {
    try {
      const raw = localStorage.getItem("potok_extensions");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleRegistryChange = () => setTick((t) => t + 1);
    ExtensionRegistry.addListener(handleRegistryChange);
    return () => ExtensionRegistry.removeListener(handleRegistryChange);
  }, []);

  useEffect(() => {
    const syncExtensions = () => {
      try {
        const raw = localStorage.getItem("potok_extensions");
        setExtensions(raw ? JSON.parse(raw) : []);
      } catch (err) {
        logger.error("[SettingsPage] Sync failed:", err);
      }
    };

    window.addEventListener("potok_extensions_updated", syncExtensions);
    window.addEventListener("storage", syncExtensions);

    return () => {
      window.removeEventListener("potok_extensions_updated", syncExtensions);
      window.removeEventListener("storage", syncExtensions);
    };
  }, []);

  const slotContributions = ExtensionRegistry.getSlotContributions("settings-tabs");
  const configExtensions = extensions.filter(
    (ext) => ext.enabled && ext.manifest.config && Object.keys(ext.manifest.config).length > 0,
  );

  return { extensions, slotContributions, configExtensions };
}
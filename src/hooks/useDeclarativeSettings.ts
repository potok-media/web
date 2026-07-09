import { useCallback, useEffect, useMemo, useState } from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import {
  type DeclarativeConfig,
  type DeclarativeSettingValue,
  getDeclarativeConfig,
} from "../components/settings/declarativeSettingsTypes";

function readStoredValue(
  configItem: DeclarativeConfig[string],
  storedValue: string,
): DeclarativeSettingValue {
  if (configItem.type === "boolean") {
    return storedValue === "true";
  }
  if (configItem.type === "number") {
    const parsed = Number(storedValue);
    return Number.isNaN(parsed) ? (configItem.default as number) : parsed;
  }
  return storedValue;
}

function loadInitialSettings(extId: string, config: DeclarativeConfig): Record<string, DeclarativeSettingValue> {
  const initialSettings: Record<string, DeclarativeSettingValue> = {};
  Object.keys(config).forEach((key) => {
    const configItem = config[key];
    const localStorageKey = `potok_plugin:scoped:${extId}:${key}`;
    const storedValue = localStorage.getItem(localStorageKey);

    if (storedValue !== null) {
      initialSettings[key] = readStoredValue(configItem, storedValue);
    } else {
      initialSettings[key] = configItem.default ?? "";
    }
  });
  return initialSettings;
}

export function useDeclarativeSettings(ext: RegisteredExtension) {
  const config = useMemo(() => getDeclarativeConfig(ext), [ext]);
  const [settings, setSettings] = useState<Record<string, DeclarativeSettingValue>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSettings(loadInitialSettings(ext.id, config));
  }, [ext.id, config]);

  useEffect(() => {
    const handleFormUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ pluginId: string; updates?: Record<string, DeclarativeSettingValue> }>;
      const { pluginId, updates } = customEvent.detail;
      if (pluginId === ext.id && updates) {
        setSettings((prev) => ({ ...prev, ...updates }));
      }
    };
    window.addEventListener("potok_plugin_update_settings_fields", handleFormUpdate);
    return () => window.removeEventListener("potok_plugin_update_settings_fields", handleFormUpdate);
  }, [ext.id]);

  const handleTogglePassword = useCallback((key: string) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleChange = useCallback((key: string, val: DeclarativeSettingValue) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: val };
      ExtensionRegistry.notifySettingsFieldChanged(ext.id, key, val, next);
      return next;
    });
  }, [ext.id]);

  const handleSave = useCallback(() => {
    Object.keys(config).forEach((key) => {
      const localStorageKey = `potok_plugin:scoped:${ext.id}:${key}`;
      const value = settings[key] !== undefined ? settings[key] : config[key].default ?? "";
      localStorage.setItem(localStorageKey, String(value));
    });

    ApiClient.invalidateCache();
    window.dispatchEvent(
      new CustomEvent("potok_plugin_settings_updated", { detail: { pluginId: ext.id } }),
    );
  }, [config, ext.id, settings]);

  return {
    config,
    settings,
    showPassword,
    handleTogglePassword,
    handleChange,
    handleSave,
  };
}
import { logger } from "../../logger";

export function getScopedLocalStorage(pluginId: string): Record<string, string> {
  const store: Record<string, string> = {};
  const prefix = `potok_plugin:scoped:${pluginId}:`;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const shortKey = key.slice(prefix.length);
        const val = localStorage.getItem(key);
        if (val !== null) {
          store[shortKey] = val;
        }
      }
    }
  } catch (e) {
    logger.error("[PluginSandbox] Scoped storage helper failed:", e);
  }
  return store;
}
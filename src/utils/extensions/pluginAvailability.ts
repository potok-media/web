/**
 * Installed/enabled lookup for a plugin id, mirroring the settings UI's source of truth:
 * the `potok_extensions` localStorage list (RegisteredExtension[] with `id` + `enabled`).
 *
 * Returns true when the plugin is installed and enabled, false when the list is readable and
 * the plugin is absent or disabled, and undefined when the lookup is inconclusive (no list
 * yet, unparsable payload) — callers should then attempt the sandbox call and surface its
 * failure as the notification instead.
 */
export function getPluginAvailability(pluginId: string): boolean | undefined {
  try {
    const raw = localStorage.getItem("potok_extensions");
    if (!raw) return undefined;
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return undefined;
    const ext = list.find(
      (entry) => Boolean(entry) && typeof entry === "object" && (entry as { id?: unknown }).id === pluginId,
    );
    if (!ext) return false;
    return (ext as { enabled?: unknown }).enabled !== false;
  } catch {
    return undefined;
  }
}

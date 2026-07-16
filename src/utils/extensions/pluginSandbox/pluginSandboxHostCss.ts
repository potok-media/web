import { logger } from "../../logger";

/**
 * Global CSS injection for plugins (PotokSDK.ui.injectHostCss), gated by the "custom-css" permission.
 *
 * Each plugin can register any number of named CSS layers. A layer is a single <style> element appended
 * to the END of <head> — after the app's own bundled stylesheets — so its rules win over matching host
 * CSS at equal specificity, letting a plugin restyle any built-in component. Layers are keyed by
 * (pluginId, id): re-injecting the same id replaces its contents, and an empty css string removes it.
 * Everything is namespaced per-plugin so it can be fully torn down when the plugin is uninstalled.
 *
 * SAFEGUARD: an always-on guard stylesheet is kept as the very last element in <head>, so it also beats
 * any plugin `!important` rule at equal specificity. It forces the escape-hatch controls (the settings
 * entry and the extensions manager — marked with the `potok-safeguard` class) to stay visible and
 * clickable. This means a careless plugin can never hide the path a user needs to disable/uninstall it.
 */

const STYLE_ATTR = "data-potok-host-css";
const GUARD_ID = "potok-host-css-guard";

/** Class placed on the settings entry, the extensions category and the extensions manager. */
export const SAFEGUARD_CLASS = "potok-safeguard";

// Only always-safe properties are asserted globally (their normal value already equals what we force, so
// nothing changes visually unless a plugin tried to hide the element). Display is asserted per-selector
// with each element's real value so `display:none` is countered without altering normal layout.
//
// `:not(#\9)` is a specificity hack: it adds an ID's worth of specificity (matching a bogus id that never
// exists) without changing what the selector matches. The escape-hatch elements carry no id, so a plugin's
// class-only selectors can never out-specify this — combined with !important and last-in-<head> ordering,
// the guard wins the cascade regardless of what the plugin injects.
const G = `.${SAFEGUARD_CLASS}:not(#\\9)`;
const GUARD_CSS = `
${G} {
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  clip-path: none !important;
  filter: none !important;
}
.sidebar-nav-item${G},
.settings-nav-item${G},
.ext-manager${G} { display: flex !important; }
.settings-tab-chip${G} { display: inline-flex !important; }
`.trim();

function elementId(pluginId: string, id: string): string {
  return `potok-host-css:${pluginId}:${id}`;
}

/** Creates the guard element if missing and (re)appends it so it stays the last node in <head>. */
function ensureGuardLast(): void {
  let guard = document.getElementById(GUARD_ID) as HTMLStyleElement | null;
  if (!guard) {
    guard = document.createElement("style");
    guard.id = GUARD_ID;
    guard.textContent = GUARD_CSS;
  }
  // Re-appending moves it to the end even if a plugin style was just added after it.
  document.head.appendChild(guard);
}

export function injectPluginHostCss(pluginId: string, rawId: unknown, rawCss: unknown): void {
  const id = String(rawId ?? "").trim();
  if (!id) {
    logger.warn(`[PluginSandbox] injectHostCss from "${pluginId}" ignored: missing id`);
    return;
  }

  const css = typeof rawCss === "string" ? rawCss : "";
  const domId = elementId(pluginId, id);
  const existing = document.getElementById(domId) as HTMLStyleElement | null;

  // Empty CSS clears the layer.
  if (!css.trim()) {
    existing?.remove();
    return;
  }

  const styleTag = existing ?? document.createElement("style");
  if (!existing) {
    styleTag.id = domId;
    styleTag.setAttribute(STYLE_ATTR, pluginId);
    // Appended last so it takes precedence over the app's own stylesheets in the cascade.
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = css;

  // Keep the safeguard as the final node so it overrides this (and any) plugin layer.
  ensureGuardLast();
}

/** Removes every CSS layer a plugin injected. Called when the plugin is torn down. */
export function removePluginHostCss(pluginId: string): void {
  const tags = document.querySelectorAll(`style[${STYLE_ATTR}="${CSS.escape(pluginId)}"]`);
  tags.forEach((tag) => tag.remove());
}

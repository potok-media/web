import { logger } from "../../logger";
import type { PluginSandboxWindowBridge, PotokCustomTheme } from "./pluginSandboxTypes";

function getThemesMap(): Map<string, PotokCustomTheme> {
  const win = window as Window & PluginSandboxWindowBridge;
  if (!win.__potok_custom_themes) {
    win.__potok_custom_themes = new Map();
  }
  return win.__potok_custom_themes;
}

function themesToCss(themes: PotokCustomTheme[]): string {
  return themes
    .map((theme) => {
      const rules = Object.entries(theme.variables || {})
        .map(([key, val]) => `  ${key}: ${val};`)
        .join("\n");
      return `html[data-theme="${theme.id}"] {\n${rules}\n}`;
    })
    .join("\n");
}

export function registerPluginThemes(payload: unknown): void {
  const themesList: PotokCustomTheme[] = Array.isArray(payload)
    ? (payload as PotokCustomTheme[])
    : ((payload as { themes?: PotokCustomTheme[] })?.themes || []);

  let styleTag = document.getElementById("potok-plugin-custom-themes") as HTMLStyleElement;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "potok-plugin-custom-themes";
    document.head.appendChild(styleTag);
  }

  const customThemesMap = getThemesMap();
  themesList.forEach((theme) => {
    if (theme?.id && theme.variables) {
      customThemesMap.set(theme.id, theme);
    }
  });

  const serializableThemes = Array.from(customThemesMap.values());
  styleTag.textContent = themesToCss(serializableThemes);

  try {
    localStorage.setItem("potok_custom_themes", JSON.stringify(serializableThemes));
  } catch (e) {
    logger.error("[PluginSandbox] Failed to cache custom themes:", e);
  }
}
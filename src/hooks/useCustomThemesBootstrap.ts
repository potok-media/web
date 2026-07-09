import { useEffect } from "react";
import { logger } from "../utils/logger";

/** Inject cached custom themes from localStorage immediately to avoid FOUC. */
export function useCustomThemesBootstrap() {
  useEffect(() => {
    try {
      const cached = localStorage.getItem("potok_custom_themes");
      if (!cached) return;

      const themesList = JSON.parse(cached);
      if (!Array.isArray(themesList)) return;

      let styleTag = document.getElementById("potok-plugin-custom-themes") as HTMLStyleElement;
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "potok-plugin-custom-themes";
        document.head.appendChild(styleTag);
      }

      let cssContent = "";
      themesList.forEach((theme: { id?: string; variables?: Record<string, string> }) => {
        if (!theme?.id || !theme.variables) return;
        const rules = Object.entries(theme.variables)
          .map(([key, val]) => `  ${key}: ${val};`)
          .join("\n");
        cssContent += `html[data-theme="${theme.id}"] {\n${rules}\n}\n`;
      });
      styleTag.textContent = cssContent;
    } catch (e) {
      logger.error("[SettingsContext] Failed to load cached custom themes:", e);
    }
  }, []);
}
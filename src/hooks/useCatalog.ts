import { useState, useEffect } from "react";
import { logger } from "../utils/logger";

export interface CatalogEntry {
  id: string;
  name: string;
  author?: string;
  description?: string;
  category?: string;
  url: string;
  iconUrl?: string;
  previewUrl?: string;
  official?: boolean;
}

/**
 * Fetches the community plugin registry (plugins.json in the web-plugins repo, served via GitHub Pages).
 * Mirrors useBlacklist: same host + raw.githubusercontent fallback, short timeout, silent failure.
 */
export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      const urls = [
        "https://potok-media.github.io/web-plugins/plugins.json",
        "https://raw.githubusercontent.com/potok-media/web-plugins/main/plugins.json",
      ];
      for (const url of urls) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              const valid = data.filter(
                (e): e is CatalogEntry => e && typeof e.id === "string" && typeof e.url === "string" && typeof e.name === "string",
              );
              setCatalog(valid);
              break;
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          logger.warn(`[useCatalog] Failed to fetch catalog from ${url}:`, err);
        }
      }
    };
    fetchCatalog();
  }, []);

  return catalog;
}

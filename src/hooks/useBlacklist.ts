import { useState, useEffect } from "react";

const DEFAULT_BLACKLIST = ["potok-malicious-exploit", "adware-tracker-plugin", "potok-crypto-miner"];

export function useBlacklist() {
  const [blacklist, setBlacklist] = useState<string[]>(DEFAULT_BLACKLIST);

  useEffect(() => {
    const fetchBlacklist = async () => {
      const urls = [
        "https://potok-media.github.io/web-plugins/blacklist.json",
        "https://raw.githubusercontent.com/potok-media/web-plugins/main/blacklist.json"
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
              setBlacklist((prev) => Array.from(new Set([...prev, ...data])));
              console.log("[useBlacklist] Dynamic blacklist fetched successfully:", data);
              break;
            }
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.warn(`[useBlacklist] Failed to fetch blacklist from ${url}:`, err);
        }
      }
    };
    fetchBlacklist();
  }, []);

  return blacklist;
}

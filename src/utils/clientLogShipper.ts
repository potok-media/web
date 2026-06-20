import { logger } from "./logger";
import type { LogEntry } from "./logger";

/**
 * Ships every logger entry to the server's terminal via POST /__clientlog (handled by the
 * `potok-client-log` Vite plugin). Lets us read logs — especially the network/header logs
 * forwarded from the data worker — in the IDE terminal running `npm run preview`, when the
 * device (Apple TV / Luxo, loading over LAN) has no reachable browser console.
 *
 * NOT gated on import.meta.env.DEV: `vite preview` serves a production build (DEV=false),
 * so we gate by hostname instead — never ship from the real production domain.
 *
 * Debug-only instrumentation; remove (with the Vite plugin) once the issue is understood.
 */
const PROD_HOSTS = new Set(["beta.potok.rip"]);

export function startClientLogShipping(): void {
  if (typeof window === "undefined") return;
  if (PROD_HOSTS.has(window.location.hostname)) return;

  logger.subscribe((entry: LogEntry) => {
    try {
      const body = JSON.stringify({ level: entry.type, message: entry.message });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/__clientlog", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/__clientlog", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      /* never let logging break the app */
    }
  });
}

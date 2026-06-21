import { logger } from "./logger";
import type { LogEntry } from "./logger";
import { getEnv } from "./EnvService";

/**
 * Ships every logger entry to the server's terminal via POST /__clientlog (handled by the
 * `potok-client-log` Vite plugin). Lets us read logs — especially the network/header logs
 * forwarded from the data worker — in the IDE terminal running `npm run preview`, when the
 * device (Apple TV / Luxo, loading over LAN) has no reachable browser console.
 *
 * Gated by env, never by hostname: ships only in dev, or when VITE_DEBUG_LOG_SHIPPING=true
 * (so a `vite preview` debug build can opt in). Production without the flag never ships.
 *
 * Debug-only instrumentation; remove (with the Vite plugin) once the issue is understood.
 */
export function startClientLogShipping(): void {
  if (typeof window === "undefined") return;
  const enabled = import.meta.env.DEV || getEnv("VITE_DEBUG_LOG_SHIPPING") === "true";
  if (!enabled) return;

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

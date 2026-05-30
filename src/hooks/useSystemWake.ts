import { useEffect, useRef } from "react";
import { logger } from "../utils/logger";
import type { SystemWakeLog } from "../network/ApiTypes";

export const useSystemWake = (
  onWake: (log: SystemWakeLog) => void,
  intervalMs = 10000,
  driftThresholdMs = 5000
) => {
  const lastTickRef = useRef<number>(Date.now());
  const onWakeRef = useRef(onWake);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const expected = lastTickRef.current + intervalMs;
      const drift = now - expected;
      
      lastTickRef.current = now;

      if (drift > driftThresholdMs) {
        logger.warn(`[SystemWake] System wake detected! Drift: ${drift}ms`);
        onWakeRef.current({
          timestamp: now,
          driftMs: drift,
          navigatorOnline: navigator.onLine,
        });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, driftThresholdMs]);
};

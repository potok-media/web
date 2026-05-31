import { useEffect, useRef } from "react";
import { logger } from "../utils/logger";
import type { SystemWakeLog } from "../network/ApiTypes";

export const useSystemWake = (
  onWake: (log: SystemWakeLog) => void,
  intervalMs = 10000,
  driftThresholdMs = 5000
) => {
  const lastTickRef = useRef<number>(0);
  const onWakeRef = useRef(onWake);
  const lastWakeTriggeredRef = useRef<number>(0);

  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  useEffect(() => {
    lastTickRef.current = Date.now();

    const triggerWakeCheck = (source: string, isTick = false) => {
      const now = Date.now();
      const timeSinceLastTick = now - lastTickRef.current;
      
      // Calculate background drift:
      // If it is an interval tick, expected time is intervalMs. The drift is: timeSinceLastTick - intervalMs.
      // If it is a wake/visibility event, the timeSinceLastTick itself represents the drift.
      const drift = isTick ? timeSinceLastTick - intervalMs : timeSinceLastTick;

      // Establish new baseline tick time
      lastTickRef.current = now;

      if (drift > driftThresholdMs) {
        const cooldownMs = 10000;
        if (now - lastWakeTriggeredRef.current >= cooldownMs) {
          lastWakeTriggeredRef.current = now;
          logger.warn(`[SystemWake] System wake detected via ${source}! Drift: ${drift}ms`);
          onWakeRef.current({
            timestamp: now,
            driftMs: drift,
            navigatorOnline: navigator.onLine,
          });
        } else {
          logger.log(`[SystemWake] System wake drift of ${drift}ms detected via ${source}, but throttled by 10s cooldown guard.`);
        }
      }
    };

    // 1. Regular interval check
    const interval = setInterval(() => {
      triggerWakeCheck("interval", true);
    }, intervalMs);

    // 2. Visible-aware and focus events for background drift detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerWakeCheck("visibilitychange");
      } else {
        // Tab went to background: establish a clean baseline of when it was backgrounded
        lastTickRef.current = Date.now();
      }
    };

    const handlePageShow = () => {
      triggerWakeCheck("pageshow");
    };

    const handleFocus = () => {
      triggerWakeCheck("focus");
    };

    const handleBlur = () => {
      // Establish baseline tick time on blur so we accurately measure drift when focused back
      lastTickRef.current = Date.now();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [intervalMs, driftThresholdMs]);
};

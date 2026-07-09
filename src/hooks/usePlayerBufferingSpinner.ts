import { useCallback, useEffect, useRef, useState } from "react";

export function usePlayerBufferingSpinner(isBuffering: boolean) {
  const [showSpinner, setShowSpinner] = useState(false);
  const spinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isBuffering) {
      spinnerTimerRef.current = setTimeout(() => setShowSpinner(true), 350);
    } else {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
      spinnerTimerRef.current = null;
      setShowSpinner(false);
    }
    return () => {
      if (spinnerTimerRef.current) clearTimeout(spinnerTimerRef.current);
    };
  }, [isBuffering]);

  const resetSpinner = useCallback(() => setShowSpinner(false), []);

  return { showSpinner, resetSpinner };
}
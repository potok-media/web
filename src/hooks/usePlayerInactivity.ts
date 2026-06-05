import { useState, useEffect, useRef, useCallback } from "react";

export function usePlayerInactivity(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const handleUserActivity = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [videoRef]);

  useEffect(() => {
    handleUserActivity();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleUserActivity]);

  return {
    controlsVisible,
    setControlsVisible,
    handleUserActivity,
  };
}

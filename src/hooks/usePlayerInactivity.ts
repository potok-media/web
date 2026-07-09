import { useState, useEffect, useRef, useCallback } from "react";

export function usePlayerInactivity(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  suppressAutoHide?: () => boolean,
) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAutoHideRef = useRef(suppressAutoHide);
  suppressAutoHideRef.current = suppressAutoHide;

  const scheduleHide = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (suppressAutoHideRef.current?.()) return;
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [videoRef]);

  const handleUserActivity = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

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

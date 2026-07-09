import { useCallback, useEffect, useRef } from "react";
import type { Location } from "react-router-dom";

export function useAppLayoutScroll(location: Location) {
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});

  const handleScroll = useCallback(() => {
    if (mainContentRef.current) {
      scrollPositions.current[location.key || location.pathname] = mainContentRef.current.scrollTop;
    }
  }, [location.pathname, location.key]);

  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const savedPos = scrollPositions.current[location.key || location.pathname] || 0;
    const timer = setTimeout(() => {
      container.scrollTo(0, savedPos);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, location.key]);

  return { mainContentRef, handleScroll };
}
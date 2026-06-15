import { useState, useEffect } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

/**
 * Tracks whether the viewport is at mobile width via matchMedia.
 * Used to conditionally render mobile-only vs desktop-only layouts so that only
 * one variant is mounted in the DOM at a time (TV WebViews are sensitive to node
 * count — rendering both and hiding one with CSS doubles the markup).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isMobile;
}

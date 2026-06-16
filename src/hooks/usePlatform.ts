import { useIsMobile } from "./useIsMobile";
import { PlatformManager } from "../utils/PlatformManager";

export interface PlatformFlags {
  /** Running on a TV / 10-foot device (Android TV WebView, ?tv=true, etc.). */
  isTV: boolean;
  /** Narrow touch viewport — and NOT a TV. */
  isMobile: boolean;
  /** Pointer/desktop — neither TV nor mobile. The branch we must never alter. */
  isDesktop: boolean;
}

/**
 * Single source of truth for platform branching across the app. Replaces ad-hoc
 * `PlatformManager.isTV()` + `useIsMobile()` combinations sprinkled per component.
 *
 * `isTV` is fixed for the session (decided at load by PlatformManager); `isMobile`
 * is reactive to viewport width. The flags are mutually exclusive — exactly one of
 * isTV / isMobile / isDesktop is true.
 */
export function usePlatform(): PlatformFlags {
  const isTV = PlatformManager.isTV();
  const isNarrow = useIsMobile();
  const isMobile = isNarrow && !isTV;
  return {
    isTV,
    isMobile,
    isDesktop: !isTV && !isMobile,
  };
}

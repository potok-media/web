import { useIsMobile } from "./useIsMobile";

export interface PlatformFlags {
  /** Running on a TV / 10-foot device. Always false for this clean web version. */
  isTV: boolean;
  /** Narrow touch viewport. */
  isMobile: boolean;
  /** Pointer/desktop. */
  isDesktop: boolean;
}

export function usePlatform(): PlatformFlags {
  const isMobile = useIsMobile();
  return {
    isTV: false,
    isMobile,
    isDesktop: !isMobile,
  };
}

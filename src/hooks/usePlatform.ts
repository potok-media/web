import { useIsMobile } from "./useIsMobile";

export interface PlatformFlags {
  isMobile: boolean;
  isDesktop: boolean;
}

export function usePlatform(): PlatformFlags {
  const isMobile = useIsMobile();
  return {
    isMobile,
    isDesktop: !isMobile,
  };
}

import { logger } from "./logger";

export interface ActivePlayback {
  streamUrl: string;
  title: string;
  mediaType: string;
  id: number;
  season?: number;
  episode?: number;
  torrentHash?: string;
  playlist?: any[];
  playlistIndex?: number;
  audios?: any[];
  headers?: Record<string, string>;
  streamType?: string;
  voice?: string;
}

export type PlatformType = "web";

export const PlatformManager = {
  getPlatform(): PlatformType {
    return "web";
  },

  isTV(): boolean {
    return false;
  },

  isAppleTvHost(): boolean {
    return false;
  },

  openNativeKeyboard(): void {},

  playVideo(_playback: ActivePlayback): boolean {
    return false; // Always fallback to Web ArtPlayer
  },

  exitApp(): void {
    logger.log("[PlatformManager] Exiting application (web version window.close)");
    window.close();
  },

  tvFontFactor(): number {
    return 1;
  },

  init(): void {
    if (typeof window === "undefined") return;
    logger.log("[PlatformManager] Initializing clean web platform version");
    document.body.classList.remove("is-tv");
  }
};

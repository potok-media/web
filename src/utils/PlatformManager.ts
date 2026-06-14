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

declare global {
  interface Window {
    AndroidBridge?: {
      playVideo(payloadJson: string): void;
      exitApp(): void;
    };
    tizen?: any;
    webOS?: any;
    webkit?: {
      messageHandlers?: {
        AppleBridge?: {
          postMessage(message: any): void;
        };
      };
    };
  }
}

export type PlatformType = "web" | "android-tv" | "apple-tv" | "tizen" | "webos";

export const PlatformManager = {
  getPlatform(): PlatformType {
    if (typeof window === "undefined") return "web";

    // 1. Android TV Wrapper Check
    if (window.AndroidBridge) {
      return "android-tv";
    }

    // 2. Apple TV Wrapper Check
    if (window.webkit?.messageHandlers?.AppleBridge) {
      return "apple-tv";
    }

    // 3. Samsung Tizen Check
    if (window.tizen) {
      return "tizen";
    }

    // 4. LG webOS Check
    if (window.webOS || navigator.userAgent.toLowerCase().includes("webos")) {
      return "webos";
    }

    // 5. User-Agent fallbacks for TV platforms
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android") && (ua.includes("googletv") || ua.includes("smarttv") || ua.includes("large-screen") || ua.includes("tv"))) {
      return "android-tv";
    }
    if (ua.includes("appletv")) {
      return "apple-tv";
    }

    return "web";
  },

  isTV(): boolean {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tv") === "true" || localStorage.getItem("tvMode") === "true") {
        return true;
      }
    }
    return this.getPlatform() !== "web";
  },

  playVideo(playback: ActivePlayback): boolean {
    const platform = this.getPlatform();

    if (platform === "android-tv" && window.AndroidBridge) {
      try {
        window.AndroidBridge.playVideo(JSON.stringify(playback));
        return true;
      } catch (e) {
        console.error("[PlatformManager] AndroidBridge playVideo failed:", e);
      }
    }

    if (platform === "apple-tv" && window.webkit?.messageHandlers?.AppleBridge) {
      try {
        window.webkit.messageHandlers.AppleBridge.postMessage({
          action: "playVideo",
          payload: playback
        });
        return true;
      } catch (e) {
        console.error("[PlatformManager] AppleBridge playVideo failed:", e);
      }
    }

    return false; // Fallback to Web ArtPlayer
  },

  exitApp(): void {
    const platform = this.getPlatform();
    console.log(`[PlatformManager] Exiting application for platform: ${platform}`);

    if (platform === "android-tv" && window.AndroidBridge) {
      window.AndroidBridge.exitApp();
    } else if (platform === "tizen" && window.tizen) {
      try {
        window.tizen.application.getCurrentApplication().exit();
      } catch (e) {
        console.error("[PlatformManager] Tizen exit failed:", e);
      }
    } else if (platform === "webos") {
      window.close();
    } else if (platform === "apple-tv" && window.webkit?.messageHandlers?.AppleBridge) {
      window.webkit.messageHandlers.AppleBridge.postMessage({ action: "exitApp" });
    }
  },

  init(): void {
    if (typeof window === "undefined") return;

    const platform = this.getPlatform();
    console.log(`[PlatformManager] Initializing for platform: ${platform}`);

    // Set TV class on body
    if (this.isTV()) {
      document.body.classList.add("is-tv");
    } else {
      document.body.classList.remove("is-tv");
    }

    // Register Tizen Back Key
    if (platform === "tizen" && window.tizen?.tvinput) {
      try {
        window.tizen.tvinput.registerKey("back");
      } catch (e) {
        console.error("[PlatformManager] Tizen key registration failed:", e);
      }
    }

    // Set up D-pad Back Key Mapping
    const PLATFORM_KEYS = {
      TIZEN_BACK: 10009,
      WEBOS_BACK: 461,
      ANDROID_BACK: 4,
      STANDARD_BACK: 27 // Escape
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;

      // Prevent native browser spatial navigation highlighting and scrolling on TVs
      if (
        PlatformManager.isTV() &&
        (code === 38 || // ArrowUp
         code === 40 || // ArrowDown
         code === 37 || // ArrowLeft
         code === 39 || // ArrowRight
         code === 13)   // Enter
      ) {
        e.preventDefault();
      }

      if (
        code === PLATFORM_KEYS.TIZEN_BACK ||
        code === PLATFORM_KEYS.WEBOS_BACK ||
        code === PLATFORM_KEYS.ANDROID_BACK ||
        code === PLATFORM_KEYS.STANDARD_BACK
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Dispatch a custom cancelable event to let UI elements (modals, overlays) intercept back action
        const backEvent = new CustomEvent("potok-back-pressed", {
          cancelable: true,
          bubbles: true
        });

        window.dispatchEvent(backEvent);
      }
    };

    window.removeEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleKeyDown);
  }
};

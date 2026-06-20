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

// TV-exclusive User-Agent tokens for third-party WebViews (e.g. Luxo on Apple TV) that
// inject no JS bridge. Deliberately curated to strings that NEVER appear in desktop or
// phone browser UAs, so this fallback can't misfire and break the desktop layout.
const GENERIC_TV_UA_TOKENS = [
  "smarttv", "smart-tv", "smart tv", "googletv", "google tv", "android tv",
  "crkey", "hbbtv", "netcast", "bravia", "vidaa", "firetv", "fire tv",
  "aftt", "afts", "aftm", "aftb",
];

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
    if (
      ua.includes("android") &&
      (ua.includes("googletv") || ua.includes("google tv") || ua.includes("android tv") ||
       ua.includes("smarttv") || ua.includes("mibox") || ua.includes("mitv") ||
       ua.includes("bravia") || ua.includes("aft") || ua.includes("large-screen") || ua.includes("tv"))
    ) {
      return "android-tv";
    }
    // Real Apple TV UA carries "Apple TV" (→ "apple tv" lowercased); the old "appletv"
    // (no space) check missed it.
    if (ua.includes("appletv") || ua.includes("apple tv")) {
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
    if (this.getPlatform() !== "web") return true;
    // Last-resort auto-detect for unknown TV WebViews that inject no bridge and aren't
    // covered above (generic smart TVs, Chromecast, Fire TV in browser mode, etc.).
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (GENERIC_TV_UA_TOKENS.some((token) => ua.includes(token))) return true;

      // Apple TV's WKWebView (e.g. the Luxo app) masquerades as an iPad: identical UA,
      // no "Apple TV" token, no AppleBridge. The reliable tell is the screen — every real
      // iPad is Retina (devicePixelRatio >= 2), so an "iPad" UA at dpr === 1 on a large
      // landscape screen is an Apple TV, not a tablet. (Mirrors Lampa's 1920×1080 check,
      // but dpr is the robust discriminator across output resolutions.)
      if (
        ua.includes("ipad") &&
        typeof window !== "undefined" &&
        window.devicePixelRatio === 1 &&
        window.innerWidth >= 1280 &&
        window.innerWidth > window.innerHeight
      ) {
        return true;
      }
    }
    return false;
  },

  playVideo(playback: ActivePlayback): boolean {
    const platform = this.getPlatform();

    if (platform === "android-tv" && window.AndroidBridge) {
      try {
        window.AndroidBridge.playVideo(JSON.stringify(playback));
        return true;
      } catch (e) {
        logger.error("[PlatformManager] AndroidBridge playVideo failed:", e);
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
        logger.error("[PlatformManager] AppleBridge playVideo failed:", e);
      }
    }

    return false; // Fallback to Web ArtPlayer
  },

  exitApp(): void {
    const platform = this.getPlatform();
    logger.log(`[PlatformManager] Exiting application for platform: ${platform}`);

    if (platform === "android-tv" && window.AndroidBridge) {
      window.AndroidBridge.exitApp();
    } else if (platform === "tizen" && window.tizen) {
      try {
        window.tizen.application.getCurrentApplication().exit();
      } catch (e) {
        logger.error("[PlatformManager] Tizen exit failed:", e);
      }
    } else if (platform === "webos") {
      window.close();
    } else if (platform === "apple-tv" && window.webkit?.messageHandlers?.AppleBridge) {
      window.webkit.messageHandlers.AppleBridge.postMessage({ action: "exitApp" });
    }
  },

  // TV panels report wildly different CSS viewport widths (Apple TV ≈1920; many Android TV
  // WebViews ≈960–1280). The 10-foot UI is sized by the root font-size, and a CSS px is
  // physically bigger on a narrower viewport — so the SAME font multiplier looks ~2× larger on a
  // 960-wide panel than on 1920. Normalize the multiplier to a 1920 reference (dpr cancels out:
  // physical size ∝ css-size / innerWidth), so the UI is the same physical size on every TV.
  // Presets (1.6/1.4/1.2 in AccessibilitySettings) are thus calibrated for a 1920 panel.
  tvFontFactor(): number {
    if (typeof window === "undefined") return 1;
    const f = (window.innerWidth || 1920) / 1920;
    return Math.max(0.5, Math.min(1.1, f));
  },

  init(): void {
    if (typeof window === "undefined") return;

    const platform = this.getPlatform();
    logger.log(`[PlatformManager] Initializing for platform: ${platform}`);

    // Fingerprint the environment so a third-party WebView (Luxo on Apple TV, etc.) is
    // identifiable in the logs — the UA isn't in our request headers (the engine adds it),
    // and detection currently reports "web" when it misses. Debug instrumentation.
    try {
      const w = window as unknown as { tizen?: unknown; webOS?: unknown };
      logger.log(`[PlatformManager] UA: ${navigator.userAgent}`);
      logger.log(
        `[PlatformManager] signals: isTV=${this.isTV()} ` +
        `viewport=${window.innerWidth}x${window.innerHeight} dpr=${window.devicePixelRatio} ` +
        `appleBridge=${!!window.webkit?.messageHandlers?.AppleBridge} ` +
        `androidBridge=${!!window.AndroidBridge} tizen=${!!w.tizen} webOS=${!!w.webOS} ` +
        `hoverNone=${typeof matchMedia !== "undefined" && matchMedia("(hover: none)").matches} ` +
        `maxTouch=${navigator.maxTouchPoints} tvModeFlag=${localStorage.getItem("tvMode")}`
      );
    } catch { /* fingerprint is best-effort */ }

    // Set TV class on body
    if (this.isTV()) {
      document.body.classList.add("is-tv");
      // Apply the user's "light mode" class before first paint to avoid a flash of the
      // heavier (rounded/shadowed) styling. The source of truth is the same `tvLightMode`
      // setting React keeps in sync afterwards. `JSON.stringify(true)` === "true".
      if (localStorage.getItem("tvLightMode") === "true") {
        document.body.classList.add("tv-light");
      }
      // Size the 10-foot UI by bumping the root font-size: everything dimensional is rem-based, so
      // this scales the whole UI crisply at the panel's native resolution — no transform/zoom (which
      // blur on tvOS WebKit). Applied synchronously here to avoid a flash of the un-scaled layout;
      // AppSettingsContext keeps it in sync afterwards. TV default is bigger than desktop (10-foot).
      let storedScale = 1.4;
      try {
        const raw = localStorage.getItem("uiFontScale");
        if (raw != null) storedScale = Number(JSON.parse(raw)) || 1.4;
      } catch { /* default scale */ }
      const factor = this.tvFontFactor();
      const pct = Math.round(storedScale * factor * 100);
      document.documentElement.style.fontSize = `${pct}%`;
      logger.log(`[PlatformManager] TV font-size=${pct}% (preset ${storedScale} × viewport factor ${factor.toFixed(3)} @ innerWidth ${window.innerWidth})`);
    } else {
      document.body.classList.remove("is-tv");
    }

    // Register Tizen Back Key
    if (platform === "tizen" && window.tizen?.tvinput) {
      try {
        window.tizen.tvinput.registerKey("back");
      } catch (e) {
        logger.error("[PlatformManager] Tizen key registration failed:", e);
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

    // Note: D-pad arrow throttling lives in main.tsx (single capture-phase listener),
    // so it is intentionally not duplicated here.
  }
};

import React from "react";
import ReactDOM from "react-dom";
import { Outlet, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings, useConnectionHealth, usePlayback } from "../context/AppSettingsContext";
import { useInspector } from "../context/InspectorContext";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { getEnv } from "../utils/EnvService";
import { WebMediaPlayer } from "./WebMediaPlayer";
import { ErrorBoundary } from "./ErrorBoundary";
import { OfflineOverlay } from "./OfflineOverlay";
import { FocusTrap } from "./FocusTrap";
import { PluginSandbox } from "./common/PluginSandbox";
import { PlatformManager } from "../utils/PlatformManager";
import { useIsMobile } from "../hooks/useIsMobile";
import { getCurrentFocusKey, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { setActiveRoute, recallFocus } from "../utils/focusMemory";
import "../styles/layout.css";
import { logger } from "../utils/logger";

const DeveloperInspector = React.lazy(() => import("./common/extension/DeveloperInspector"));

export const AppLayout: React.FC = () => {
  const { t } = useTranslation("common");
  const location = useLocation();
  // Tag the active route during render (before child pages mount/focus) so focusMemory records
  // each focus change under the correct route — enabling focus restoration on Back.
  setActiveRoute(location.key || location.pathname);
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const scrollPositions = React.useRef<Record<string, number>>({});

  const isMobile = useIsMobile();

  const handleScroll = React.useCallback(() => {
    if (mainContentRef.current) {
      scrollPositions.current[location.key || location.pathname] = mainContentRef.current.scrollTop;
    }
  }, [location.pathname, location.key]);

  React.useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const savedPos = scrollPositions.current[location.key || location.pathname] || 0;
    
    // We use a small timeout to let the DOM render before restoring scroll position
    const timer = setTimeout(() => {
      container.scrollTo(0, savedPos);
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, location.key]);

  // Universal focus restoration on Back — covers EVERY route, including pages created by plugins
  // via the SDK (which we can't wire individually). Pages render their focusables asynchronously
  // and may set their own default focus, so we retry briefly until the remembered element exists,
  // then stop (no re-asserting → never fights the user once restored). Routes visited fresh
  // (forward nav) have no saved key → this no-ops and the page's own default focus stands.
  React.useEffect(() => {
    if (!PlatformManager.isTV()) return;
    const saved = recallFocus(location.key || location.pathname);
    if (!saved) return;
    let raf = 0;
    const deadline = Date.now() + 1500;
    const attempt = () => {
      if (getCurrentFocusKey() === saved) return;       // restored (here or by the page itself)
      setFocus(saved);
      if (getCurrentFocusKey() === saved || Date.now() > deadline) return;
      raf = requestAnimationFrame(attempt);             // element not mounted yet → keep trying
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [location.key, location.pathname]);

  const {
    connectionState,
    checkConnection,
  } = useConnectionHealth();

  const {
    connectionProfiles,
    activeProfileID,
    updateProfile,
    addProfile,
    developerMode,
  } = useSettings();

  const {
    isInspectorActive,
    setIsInspectorActive
  } = useInspector();

  const isDesktop = !PlatformManager.isTV() && window.innerWidth > 768;

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleBackPressed = (e: Event) => {
      if (e.defaultPrevented) return;

      const isHome = location.pathname === "/";
      if (isHome) {
        PlatformManager.exitApp();
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("potok-back-pressed", handleBackPressed);
    return () => {
      window.removeEventListener("potok-back-pressed", handleBackPressed);
    };
  }, [location.pathname, navigate]);

  // Driven by AppSidebar's norigin `hasFocusedChild` (via onFocusChange) — the
  // authoritative signal for whether spatial-navigation focus is inside the sidebar.
  const [isSidebarFocused, setIsSidebarFocused] = React.useState(false);

  // TV: pressing LEFT with nowhere left to go (left edge of content) opens the
  // sidebar on the active section. Deterministic — only fires when LEFT did NOT move
  // focus, and never while a modal/popover holds focus.
  React.useEffect(() => {
    if (!PlatformManager.isTV()) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.keyCode !== 37) return;
      // Any open Overlay tags itself with data-tv-overlay; the trailing legacy
      // selectors cover the non-React PWA update prompt.
      if (document.querySelector("[data-tv-overlay], .potok-update-modal-overlay")) return;
      const before = getCurrentFocusKey();
      if (!before || (typeof before === "string" && before.startsWith("SIDEBAR"))) return;
      requestAnimationFrame(() => {
        if (getCurrentFocusKey() === before) {
          setFocus("SIDEBAR");
        }
      });
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, []);

  const {
    activePlayback,
    playVideo,
    stopVideo,
  } = usePlayback();

  const hasPlayingParam = searchParams.get("playing") === "true";

  // Use refs to avoid dependencies in effects causing loops/races
  const activePlaybackRef = React.useRef(activePlayback);
  const playVideoRef = React.useRef(playVideo);
  const stopVideoRef = React.useRef(stopVideo);
  const setSearchParamsRef = React.useRef(setSearchParams);
  const hasPlayingParamRef = React.useRef(hasPlayingParam);

  React.useEffect(() => {
    activePlaybackRef.current = activePlayback;
    playVideoRef.current = playVideo;
    stopVideoRef.current = stopVideo;
    setSearchParamsRef.current = setSearchParams;
    hasPlayingParamRef.current = hasPlayingParam;
  });

  // URL -> State Synchronization
  React.useEffect(() => {
    if (hasPlayingParam) {
      if (!activePlaybackRef.current) {
        try {
          const saved = sessionStorage.getItem("potok_last_playback");
          if (saved) {
            playVideoRef.current(JSON.parse(saved));
          } else {
            setSearchParamsRef.current(prev => {
              const next = new URLSearchParams(prev);
              next.delete("playing");
              return next;
            }, { replace: true });
          }
        } catch (e) {
          logger.error("Failed to restore playback state from sessionStorage", e);
        }
      }
    } else {
      if (activePlaybackRef.current) {
        stopVideoRef.current();
      }
    }
  }, [hasPlayingParam]);

  // State -> URL Synchronization
  React.useEffect(() => {
    if (activePlayback) {
      sessionStorage.setItem("potok_last_playback", JSON.stringify(activePlayback));
      if (!hasPlayingParamRef.current) {
        setSearchParamsRef.current(prev => {
          const next = new URLSearchParams(prev);
          next.set("playing", "true");
          return next;
        });
      }
    } else {
      sessionStorage.removeItem("potok_last_playback");
      if (hasPlayingParamRef.current) {
        setSearchParamsRef.current(prev => {
          const next = new URLSearchParams(prev);
          next.delete("playing");
          return next;
        });
      }
    }
  }, [activePlayback]);

  const handleClosePlayer = React.useCallback(() => {
    if (searchParams.get("playing") === "true") {
      navigate(-1);
    } else {
      stopVideo();
    }
  }, [searchParams, navigate, stopVideo]);

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;
  const [inputUrl, setInputUrl] = React.useState(
    activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || ""
  );

  const [prevActiveProfileID, setPrevActiveProfileID] = React.useState<string | null>(activeProfileID);

  if (activeProfileID !== prevActiveProfileID) {
    setPrevActiveProfileID(activeProfileID);
    setInputUrl(activeProfile?.gatewayURL || getEnv("VITE_DEFAULT_BFF_URL") || "");
  }

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (PlatformManager.isTV()) {
      return true;
    }
    const saved = localStorage.getItem("isSidebarCollapsed");
    return saved === null ? false : saved === "true";
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("isSidebarCollapsed", String(next));
      return next;
      });
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const targetUrl = inputUrl.trim().replace(/\/$/, "");

    if (activeProfile) {
      updateProfile({
        ...activeProfile,
        gatewayURL: targetUrl,
        playerServerURL: activeProfile.playerServerURL,
        searchEngineURL: activeProfile.searchEngineURL,
      });
    } else {
      addProfile({
        name: "Local BFF",
        gatewayURL: targetUrl,
        playerServerURL: "",
        searchEngineURL: "",
        playerServerAuthEnabled: false,
        playerServerAuthLogin: "",
      });
    }

    setTimeout(() => {
      checkConnection();
    }, 150);
  };

  const isSidebarCollapsedEffective = isSidebarCollapsed && !isSidebarFocused;

  return (
    <div className={`app-container ${isSidebarCollapsedEffective ? "sidebar-collapsed" : ""} ${isMobile ? "mobile-layout" : ""}`}>
      {!isMobile && (
        <AppSidebar
          isCollapsed={isSidebarCollapsedEffective}
          onToggle={toggleSidebar}
          pathname={location.pathname}
          search={location.search}
          onFocusChange={setIsSidebarFocused}
        />
      )}
      <main
        ref={mainContentRef}
        onScroll={handleScroll}
        className="main-content"
        aria-hidden={connectionState !== "connected"}
      >
        <Outlet />
      </main>

      <PluginSandbox />

      {isMobile && <MobileBottomNavigation />}

      {activePlayback && (
        <ErrorBoundary fallback={(error, resetError) => (
          <div style={{
            position: "fixed",
            bottom: "1.25rem",
            right: "1.25rem",
            zIndex: 9999,
            width: "21.875rem",
            padding: "1rem",
            background: "rgba(20, 20, 20, 0.95)",
            backdropFilter: "blur(25px)",
            borderRadius: "0.75rem",
            border: "1px solid var(--error, #ef4444)",
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <h4 style={{ color: "var(--error, #ef4444)", margin: "0 0 0.5rem 0" }}>{t("playerError")}</h4>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, margin: "0 0 1rem 0" }}>
              {error.message || t("playbackFailed")}
            </p>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                onClick={resetError}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "var(--error, #ef4444)",
                  border: "none",
                  borderRadius: "0.25rem",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                {t("actions.retry")}
              </button>
              <button
                onClick={handleClosePlayer}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "0.25rem",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                {t("actions.close")}
              </button>
            </div>
          </div>
        )}>
          <WebMediaPlayer
            key={`${activePlayback.id}-${activePlayback.season || 0}-${activePlayback.episode || 0}-${activePlayback.streamUrl}`}
            playback={activePlayback}
            onClose={handleClosePlayer}
            isNetworkOffline={connectionState === "offline"}
          />
        </ErrorBoundary>
      )}

      {connectionState !== "connected" && ReactDOM.createPortal(
        <FocusTrap>
          <OfflineOverlay
            connectionState={connectionState}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            handleSaveAndConnect={handleSaveAndConnect}
            activeProfile={activeProfile}
            checkConnection={checkConnection}
          />
        </FocusTrap>,
        document.body
      )}

      {/* Inspector toggle button */}
      {isDesktop && developerMode && (
        <button
          onClick={() => setIsInspectorActive(!isInspectorActive)}
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            borderRadius: "1.875rem",
            border: "none",
            background: isInspectorActive ? "#ef4444" : "var(--accent, #3b82f6)",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease",
            transform: "translateY(0)"
          }}
        >
          <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{isInspectorActive ? t("inspector.disable") : t("inspector.enable")}</span>
        </button>
      )}
      {isDesktop && developerMode && isInspectorActive && (
        <React.Suspense fallback={<div className="inspector-loading" style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 99999, color: "#fff" }}>{t("loadingEditor")}</div>}>
          <DeveloperInspector />
        </React.Suspense>
      )}
    </div>
  );
};

export default AppLayout;

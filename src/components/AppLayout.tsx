import React from "react";
import ReactDOM from "react-dom";
import { Outlet, useLocation } from "react-router-dom";
import { useSettings, useConnectionHealth, usePlayback } from "../context/AppSettingsContext";
import { AppSidebar } from "./AppSidebar";
import { getEnv } from "../utils/EnvService";
import { WebMediaPlayer } from "./WebMediaPlayer";
import { ErrorBoundary } from "./ErrorBoundary";
import { OfflineOverlay } from "./OfflineOverlay";
import { FocusTrap } from "./FocusTrap";
import "../styles/layout.css";

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const scrollPositions = React.useRef<Record<string, number>>({});

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

  const {
    connectionState,
    checkConnection,
  } = useConnectionHealth();

  const {
    connectionProfiles,
    activeProfileID,
    updateProfile,
    addProfile,
  } = useSettings();

  const {
    activePlayback,
    stopVideo,
  } = usePlayback();

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
    return localStorage.getItem("isSidebarCollapsed") === "true";
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
        name: "Локальный BFF",
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

  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main
        ref={mainContentRef}
        onScroll={handleScroll}
        className="main-content"
        aria-hidden={connectionState !== "connected"}
      >
        <Outlet />
      </main>

      {activePlayback && (
        <ErrorBoundary fallback={(error, resetError) => (
          <div style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            width: "350px",
            padding: "1rem",
            background: "rgba(20, 20, 20, 0.95)",
            backdropFilter: "blur(25px)",
            borderRadius: "12px",
            border: "1px solid var(--error, #ef4444)",
            color: "#fff",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <h4 style={{ color: "var(--error, #ef4444)", margin: "0 0 0.5rem 0" }}>Ошибка плеера</h4>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, margin: "0 0 1rem 0" }}>
              {error.message || "Не удалось воспроизвести видео."}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={resetError}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "var(--error, #ef4444)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}
              >
                Повторить
              </button>
              <button
                onClick={stopVideo}
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        )}>
          <WebMediaPlayer
            key={`${activePlayback.id}-${activePlayback.season || 0}-${activePlayback.episode || 0}-${activePlayback.streamUrl}`}
            playback={activePlayback}
            onClose={stopVideo}
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
    </div>
  );
};

export default AppLayout;

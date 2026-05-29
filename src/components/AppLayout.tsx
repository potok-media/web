import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAppSettings } from "../context/AppSettingsContext";
import { AppSidebar } from "./AppSidebar";
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
    connectionProfiles,
    activeProfileID,
    updateProfile,
    addProfile
  } = useAppSettings();

  const activeProfile = connectionProfiles.find((p) => p.id === activeProfileID) || null;
  const [inputUrl, setInputUrl] = React.useState(activeProfile?.gatewayURL || "http://127.0.0.1:5000");
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

  React.useEffect(() => {
    if (activeProfile) {
      setInputUrl(activeProfile.gatewayURL);
    }
  }, [activeProfileID]);

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const targetUrl = inputUrl.trim().replace(/\/$/, "");

    if (activeProfile) {
      updateProfile({
        ...activeProfile,
        gatewayURL: targetUrl,
        torrentGoURL: activeProfile.torrentGoURL,
        searchEngineURL: activeProfile.searchEngineURL,
      });
    } else {
      addProfile({
        name: "Локальный BFF",
        gatewayURL: targetUrl,
        torrentGoURL: "",
        searchEngineURL: "",
        torrentGoAuthEnabled: false,
        torrentGoAuthLogin: "",
      });
    }

    setTimeout(() => {
      checkConnection();
    }, 150);
  };

  if (connectionState === "checking") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content">
          <div className="spinner" />
          <h2 className="overlay-title">Подключение к Potok...</h2>
          <p className="overlay-text">Опрашиваем шлюз API Gateway шлюза</p>
        </div>
      </div>
    );
  }

  if (connectionState === "setupRequired") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content compact">
          <h2 className="overlay-title">Требуется настройка</h2>
          <p className="overlay-text">Укажите адрес BFF-шлюза (API Gateway) для связи с сервером Potok:</p>
          
          <form onSubmit={handleSaveAndConnect} className="overlay-form">
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder="http://127.0.0.1:5000"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              Сохранить и подключиться
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (connectionState === "offline") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content compact">
          <h2 className="overlay-title error">Сервер Potok недоступен</h2>
          <p className="overlay-text">Не удалось соединиться по адресу: <strong>{activeProfile?.gatewayURL}</strong></p>
          
          <form onSubmit={handleSaveAndConnect} className="overlay-form offline">
            <label className="settings-label overlay-label">Указать другой адрес BFF:</label>
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder="http://127.0.0.1:5000"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              Применить и повторить попытку
            </button>
          </form>
          
          <button
            className="overlay-btn secondary"
            onClick={() => checkConnection()}
          >
            Проверить снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AppSidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main ref={mainContentRef} onScroll={handleScroll} className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;

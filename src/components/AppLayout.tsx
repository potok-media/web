import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/AppSettingsContext";
import { useInspector } from "../context/useInspector";
import { AppSidebar } from "./AppSidebar";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { PluginSandbox } from "./common/PluginSandbox";
import { AppLayoutPlayerOverlay } from "./appLayout/AppLayoutPlayerOverlay";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAppLayoutScroll } from "../hooks/useAppLayoutScroll";
import { useAppLayoutPlayback } from "../hooks/useAppLayoutPlayback";
import { useAppLayoutBackNavigation } from "../hooks/useAppLayoutBackNavigation";
import { useAppLayoutOfflineForm } from "../hooks/useAppLayoutOfflineForm";
import "../styles/layout.css";
import { Button, cx } from "./ui";

const DeveloperInspector = React.lazy(() => import("./common/extension/DeveloperInspector"));

export const AppLayout: React.FC = () => {
  const { t } = useTranslation("common");
  const location = useLocation();
  const isMobile = useIsMobile();
  const { mainContentRef, handleScroll } = useAppLayoutScroll(location);

  useAppLayoutBackNavigation();

  const { developerMode } = useSettings();
  const { isInspectorActive, setIsInspectorActive } = useInspector();
  const isDesktop = window.innerWidth > 768;

  const { activePlayback, handleClosePlayer } = useAppLayoutPlayback();
  const {
    connectionState,
    checkConnection,
    activeProfile,
    inputUrl,
    setInputUrl,
    handleSaveAndConnect,
  } = useAppLayoutOfflineForm();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
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

  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${isMobile ? "mobile-layout" : ""}`}>
      {!isMobile && (
        <AppSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          pathname={location.pathname}
          search={location.search}
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

      <AppLayoutPlayerOverlay
        activePlayback={activePlayback}
        connectionState={connectionState}
        onClosePlayer={handleClosePlayer}
        inputUrl={inputUrl}
        setInputUrl={setInputUrl}
        handleSaveAndConnect={handleSaveAndConnect}
        activeProfile={activeProfile}
        checkConnection={checkConnection}
      />

      {isDesktop && developerMode && (
        <Button
          onClick={() => setIsInspectorActive(!isInspectorActive)}
          variant="primary"
          size="sm"
          className={cx("inspector-toggle-btn", isInspectorActive && "inspector-toggle-btn--active")}
        >
          <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{isInspectorActive ? t("inspector.disable") : t("inspector.enable")}</span>
        </Button>
      )}
      {isDesktop && developerMode && isInspectorActive && (
        <React.Suspense fallback={<div className="inspector-loading">{t("loadingEditor")}</div>}>
          <DeveloperInspector />
        </React.Suspense>
      )}
    </div>
  );
};

export default AppLayout;
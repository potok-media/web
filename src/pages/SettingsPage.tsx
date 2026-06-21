import React, { useState, useEffect } from "react";
import { Sliders, Puzzle, Globe, Terminal, Eye } from "lucide-react";
import { useSettings } from "../context/AppSettingsContext";
import { Slot } from "../components/common/extension/Slot";
import GeneralSettings from "../components/settings/GeneralSettings";
import ProfilesSettings from "../components/settings/ProfilesSettings";
import ExtensionsManager from "../components/ExtensionsManager";
import ConsoleManager from "../components/settings/ConsoleManager";
import DeclarativeSettings from "../components/settings/DeclarativeSettings";
import AccessibilitySettings from "../components/settings/AccessibilitySettings";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { RegisteredExtension } from "@potok/sdk-types";
import { useLocation } from "react-router-dom";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { FocusableButton } from "../components/common/TVNavigation";
import { PageFrame } from "../components/common/PageFrame";
import { usePlatform } from "../hooks/usePlatform";
import "../styles/settings.css";
import "../styles/console.css";
import { logger } from "../utils/logger";

export const SettingsPage: React.FC = () => {
  const {
    accentTheme,
    defaultPlayer,
    bannerQuality,
    uiFontScale,
    developerMode,
    disableHttpProxy,
    tvLightMode,
    setAccentTheme,
    setDefaultPlayer,
    setBannerQuality,
    setUiFontScale,
    setDeveloperMode,
    setDisableHttpProxy,
    setTvLightMode,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<string>("general");
  const [, setTick] = useState(0);
  const { isTV, isMobile } = usePlatform();
  const location = useLocation();

  useEffect(() => {
    restoreFocusOrDefault(location.key || location.pathname, "SETTINGS_TAB_GENERAL");
  }, [location.key, location.pathname]);

  // Setup extensions state from localStorage and keep it in sync
  const [extensions, setExtensions] = useState<RegisteredExtension[]>(() => {
    try {
      const raw = localStorage.getItem("potok_extensions");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to ExtensionRegistry changes to display extension tabs reactively
  useEffect(() => {
    const handleRegistryChange = () => setTick((t) => t + 1);
    ExtensionRegistry.addListener(handleRegistryChange);
    return () => ExtensionRegistry.removeListener(handleRegistryChange);
  }, []);

  // Subscribe to storage and custom extensions updated event for hot-reloading settings
  useEffect(() => {
    const syncExtensions = () => {
      try {
        const raw = localStorage.getItem("potok_extensions");
        setExtensions(raw ? JSON.parse(raw) : []);
      } catch (err) {
        logger.error("[SettingsPage] Sync failed:", err);
      }
    };

    window.addEventListener("potok_extensions_updated", syncExtensions);
    window.addEventListener("storage", syncExtensions);

    return () => {
      window.removeEventListener("potok_extensions_updated", syncExtensions);
      window.removeEventListener("storage", syncExtensions);
    };
  }, []);

  const slotContributions = ExtensionRegistry.getSlotContributions("settings-tabs");

  const configExtensions = extensions.filter(
    (ext) => ext.enabled && ext.manifest.config && Object.keys(ext.manifest.config).length > 0
  );

  // ── Shared building blocks (identical markup across platform branches) ──────

  const mobileTabs = (
    <div className="settings-mobile-tabs-bar">
      <div className="settings-mobile-tabs-scroll">
        <button className={`settings-tab-chip ${activeTab === "general" ? "active" : ""}`} onClick={() => setActiveTab("general")}>Основные</button>
        <button className={`settings-tab-chip ${activeTab === "profiles" ? "active" : ""}`} onClick={() => setActiveTab("profiles")}>Подключения</button>
        <button className={`settings-tab-chip ${activeTab === "accessibility" ? "active" : ""}`} onClick={() => setActiveTab("accessibility")}>Спец. возможности</button>
        <button className={`settings-tab-chip ${activeTab === "extensions" ? "active" : ""}`} onClick={() => setActiveTab("extensions")}>Расширения</button>
        <button className={`settings-tab-chip ${activeTab === "console" ? "active" : ""}`} onClick={() => setActiveTab("console")}>Консоль</button>
        {slotContributions.map((c) => (
          <button key={c.contribution.id} className={`settings-tab-chip ${activeTab === c.contribution.id ? "active" : ""}`} onClick={() => setActiveTab(c.contribution.id)}>
            {c.contribution.title || c.contribution.id}
          </button>
        ))}
        {configExtensions.map((ext) => (
          <button key={`config-${ext.id}`} className={`settings-tab-chip ${activeTab === `config-${ext.id}` ? "active" : ""}`} onClick={() => setActiveTab(`config-${ext.id}`)}>
            {ext.manifest.name || ext.id}
          </button>
        ))}
      </div>
    </div>
  );

  const sidebarNav = (
    <>
      <div className="settings-brand">
        <h1 className="settings-brand-title">Настройки</h1>
        <p className="settings-brand-desc">Панель управления</p>
      </div>
      <div className="settings-divider" />
      <div className="settings-section-title">Приложение</div>
      <FocusableButton
        focusKey="SETTINGS_TAB_GENERAL"
        className={`settings-nav-item ${activeTab === "general" ? "active" : ""}`}
        onClick={() => setActiveTab("general")}
      >
        <Sliders size="1rem" />
        <span>Основные</span>
      </FocusableButton>
      <FocusableButton
        className={`settings-nav-item ${activeTab === "profiles" ? "active" : ""}`}
        onClick={() => setActiveTab("profiles")}
      >
        <Globe size="1rem" />
        <span>Профили подключения</span>
      </FocusableButton>
      <FocusableButton
        className={`settings-nav-item ${activeTab === "accessibility" ? "active" : ""}`}
        onClick={() => setActiveTab("accessibility")}
      >
        <Eye size="1rem" />
        <span>Специальные возможности</span>
      </FocusableButton>

      <div className="settings-section-title">Интеграции</div>
      <FocusableButton
        className={`settings-nav-item ${activeTab === "extensions" ? "active" : ""}`}
        onClick={() => setActiveTab("extensions")}
      >
        <Puzzle size="1rem" />
        <span>Расширения</span>
      </FocusableButton>
      <FocusableButton
        className={`settings-nav-item ${activeTab === "console" ? "active" : ""}`}
        onClick={() => setActiveTab("console")}
      >
        <Terminal size="1rem" />
        <span>Консоль</span>
      </FocusableButton>

      {(slotContributions.length > 0 || configExtensions.length > 0) && (
        <>
          <div className="settings-section-title">Плагины</div>
          {slotContributions.map((c) => (
            <FocusableButton
              key={c.contribution.id}
              className={`settings-nav-item ${activeTab === c.contribution.id ? "active" : ""}`}
              onClick={() => setActiveTab(c.contribution.id)}
            >
              <Puzzle size="1rem" />
              <span>{c.contribution.title || c.contribution.id}</span>
            </FocusableButton>
          ))}
          {configExtensions.map((ext) => (
            <FocusableButton
              key={`config-${ext.id}`}
              className={`settings-nav-item ${activeTab === `config-${ext.id}` ? "active" : ""}`}
              onClick={() => setActiveTab(`config-${ext.id}`)}
            >
              <Puzzle size="1rem" />
              <span>{ext.manifest.name || ext.id}</span>
            </FocusableButton>
          ))}
        </>
      )}
    </>
  );

  const panel = (
    <>
      {activeTab === "general" && (
        <GeneralSettings
          accentTheme={accentTheme}
          setAccentTheme={setAccentTheme}
          defaultPlayer={defaultPlayer}
          setDefaultPlayer={setDefaultPlayer}
          bannerQuality={bannerQuality}
          setBannerQuality={setBannerQuality}
        />
      )}
      {activeTab === "accessibility" && (
        <AccessibilitySettings
          uiFontScale={uiFontScale}
          setUiFontScale={setUiFontScale}
          developerMode={developerMode}
          setDeveloperMode={setDeveloperMode}
          disableHttpProxy={disableHttpProxy}
          setDisableHttpProxy={setDisableHttpProxy}
          tvLightMode={tvLightMode}
          setTvLightMode={setTvLightMode}
        />
      )}
      {activeTab === "profiles" && <ProfilesSettings />}
      {activeTab === "extensions" && <ExtensionsManager />}
      {activeTab === "console" && <ConsoleManager />}
      {slotContributions.some((c) => c.contribution.id === activeTab) && (
        <Slot name="settings-tabs" contributionId={activeTab} />
      )}
      {configExtensions.map((ext) => (
        activeTab === `config-${ext.id}` && (
          <DeclarativeSettings key={ext.id} ext={ext} />
        )
      ))}
    </>
  );

  // ── TV: pinned frame — sidebar + the single scrolling panel ─────────────────
  if (isTV) {
    return (
      <PageFrame
        className="settings-frame-tv"
        sidebar={<aside className="settings-sidebar">{sidebarNav}</aside>}
      >
        <main className="settings-main-content">{panel}</main>
      </PageFrame>
    );
  }

  // ── Mobile: pinned frame — tabs header + the single scrolling panel ─────────
  if (isMobile) {
    return (
      <PageFrame className="settings-frame-mobile" header={mobileTabs}>
        <main className="settings-main-content">{panel}</main>
      </PageFrame>
    );
  }

  // ── Desktop: unchanged two-pane layout ──────────────────────────────────────
  return (
    <div className="settings-page-container">
      <div className="settings-container">
        <aside className="settings-sidebar">{sidebarNav}</aside>
        <main className="settings-main-content">{panel}</main>
        <div className="settings-sidebar-spacer" />
      </div>
    </div>
  );
};

export default SettingsPage;

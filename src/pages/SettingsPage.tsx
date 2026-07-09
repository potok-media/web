import React, { useState } from "react";
import { useSettings } from "../context/AppSettingsContext";
import { PageFrame } from "../components/common/PageFrame";
import { usePlatform } from "../hooks/usePlatform";
import { useSettingsExtensions } from "../hooks/useSettingsExtensions";
import { SettingsContentPanel } from "../components/settings/SettingsContentPanel";
import { SettingsMobileTabs, SettingsSidebarNav } from "../components/settings/SettingsNavigation";
import "../styles/settings.css";
import "../styles/console.css";

export const SettingsPage: React.FC = () => {
  const {
    accentTheme,
    defaultPlayer,
    bannerQuality,
    uiFontScale,
    language,
    developerMode,
    disableHttpProxy,
    setAccentTheme,
    setDefaultPlayer,
    setBannerQuality,
    setUiFontScale,
    setLanguage,
    setDeveloperMode,
    setDisableHttpProxy,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<string>("general");
  const { isMobile } = usePlatform();
  const { slotContributions, configExtensions } = useSettingsExtensions();

  const panelProps = {
    activeTab,
    accentTheme,
    setAccentTheme,
    defaultPlayer,
    setDefaultPlayer,
    bannerQuality,
    setBannerQuality,
    language,
    setLanguage,
    uiFontScale,
    setUiFontScale,
    developerMode,
    setDeveloperMode,
    disableHttpProxy,
    setDisableHttpProxy,
    slotContributions,
    configExtensions,
  };

  if (isMobile) {
    return (
      <PageFrame className="settings-frame-mobile" header={<SettingsMobileTabs activeTab={activeTab} setActiveTab={setActiveTab} slotContributions={slotContributions} configExtensions={configExtensions} />}>
        <main className="settings-main-content">
          <SettingsContentPanel {...panelProps} />
        </main>
      </PageFrame>
    );
  }

  return (
    <div className="settings-page-container">
      <div className="settings-container">
        <aside className="settings-sidebar">
          <SettingsSidebarNav activeTab={activeTab} setActiveTab={setActiveTab} slotContributions={slotContributions} configExtensions={configExtensions} />
        </aside>
        <main className="settings-main-content">
          <SettingsContentPanel {...panelProps} />
        </main>
        <div className="settings-sidebar-spacer" />
      </div>
    </div>
  );
};

export default SettingsPage;
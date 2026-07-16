import React from "react";
import type { RegisteredExtension } from "@potok/sdk-types";
import type { SlotContribution } from "@potok/sdk-types";

type SettingsSlotEntry = { contribution: SlotContribution; pluginId: string };
import { Slot } from "../common/extension/Slot";
import GeneralSettings from "./GeneralSettings";
import ProfilesSettings from "./ProfilesSettings";
import ExtensionsManager from "../ExtensionsManager";
import ConsoleManager from "./ConsoleManager";
import DeclarativeSettings from "./DeclarativeSettings";
import AccessibilitySettings from "./AccessibilitySettings";
import AccountSettings from "./AccountSettings";

interface SettingsContentPanelProps {
  activeTab: string;
  accentTheme: string;
  setAccentTheme: (theme: string) => void;
  defaultPlayer: string | null;
  setDefaultPlayer: (player: string) => void;
  bannerQuality: string;
  setBannerQuality: (quality: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  uiFontScale: number;
  setUiFontScale: (scale: number) => void;
  developerMode: boolean;
  setDeveloperMode: (enabled: boolean) => void;
  disableHttpProxy: boolean;
  setDisableHttpProxy: (disabled: boolean) => void;
  slotContributions: SettingsSlotEntry[];
  configExtensions: RegisteredExtension[];
}

export const SettingsContentPanel: React.FC<SettingsContentPanelProps> = ({
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
}) => (
  <>
    {activeTab === "general" && (
      <GeneralSettings
        accentTheme={accentTheme}
        setAccentTheme={setAccentTheme}
        defaultPlayer={defaultPlayer}
        setDefaultPlayer={setDefaultPlayer}
        bannerQuality={bannerQuality}
        setBannerQuality={setBannerQuality}
        language={language}
        setLanguage={setLanguage}
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
      />
    )}
    {activeTab === "account" && <AccountSettings />}
    {activeTab === "profiles" && <ProfilesSettings />}
    {activeTab === "extensions" && <ExtensionsManager />}
    {activeTab === "console" && <ConsoleManager />}
    {slotContributions.some((c) => c.contribution.id === activeTab) && (
      <div className="settings-pane settings-plugin-pane">
        <Slot name="settings-tabs" contributionId={activeTab} />
      </div>
    )}
    {configExtensions.map((ext) => (
      activeTab === `config-${ext.id}` && (
        <DeclarativeSettings key={ext.id} ext={ext} />
      )
    ))}
  </>
);
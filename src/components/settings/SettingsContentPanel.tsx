import React from "react";
import type { RegisteredExtension, SlotContribution } from "@potok/sdk-types";
import { Slot } from "../common/extension/Slot";
import GeneralSettings from "./GeneralSettings";
import ProfilesSettings from "./ProfilesSettings";
import ExtensionsManager from "../ExtensionsManager";
import DeclarativeSettings from "./DeclarativeSettings";
import AccessibilitySettings from "./AccessibilitySettings";
import AccountSettings from "./AccountSettings";

type SettingsSlotEntry = { contribution: SlotContribution; pluginId: string };

interface SettingsContentPanelProps {
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
    <section id="settings-section-general" data-settings-section="general" className="settings-content-section">
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
    </section>

    <section id="settings-section-account" data-settings-section="account" className="settings-content-section">
      <AccountSettings />
    </section>

    <section id="settings-section-profiles" data-settings-section="profiles" className="settings-content-section">
      <ProfilesSettings />
    </section>

    <section id="settings-section-accessibility" data-settings-section="accessibility" className="settings-content-section">
      <AccessibilitySettings
        uiFontScale={uiFontScale}
        setUiFontScale={setUiFontScale}
        developerMode={developerMode}
        setDeveloperMode={setDeveloperMode}
        disableHttpProxy={disableHttpProxy}
        setDisableHttpProxy={setDisableHttpProxy}
      />
    </section>

    <section id="settings-section-extensions" data-settings-section="extensions" className="settings-content-section potok-safeguard">
      <ExtensionsManager />
    </section>

    {slotContributions.map((entry) => (
      <section
        key={entry.contribution.id}
        id={`settings-section-${entry.contribution.id}`}
        data-settings-section={entry.contribution.id}
        className="settings-content-section settings-content-section--slot"
      >
        <div className="settings-pane settings-plugin-pane">
          <Slot name="settings-tabs" contributionId={entry.contribution.id} />
        </div>
      </section>
    ))}

    {configExtensions.map((ext) => (
      <section
        key={ext.id}
        id={`settings-section-config-${ext.id}`}
        data-settings-section={`config-${ext.id}`}
        className="settings-content-section settings-content-section--plugin"
      >
        <DeclarativeSettings ext={ext} />
      </section>
    ))}
  </>
);

import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders, Puzzle, Globe, Terminal, Eye } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import type { SlotContribution } from "@potok/sdk-types";

type SettingsSlotEntry = { contribution: SlotContribution; pluginId: string };
import { Button, Chip } from "../ui";

interface SettingsNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  slotContributions: SettingsSlotEntry[];
  configExtensions: RegisteredExtension[];
}

export const SettingsMobileTabs: React.FC<SettingsNavigationProps> = ({
  activeTab,
  setActiveTab,
  slotContributions,
  configExtensions,
}) => {
  const { t } = useTranslation("settings");

  return (
    <div className="settings-mobile-tabs-bar">
      <div className="settings-mobile-tabs-scroll">
        <Chip active={activeTab === "general"} className="settings-tab-chip" onClick={() => setActiveTab("general")}>{t("nav.general")}</Chip>
        <Chip active={activeTab === "profiles"} className="settings-tab-chip" onClick={() => setActiveTab("profiles")}>{t("nav.connectionsShort")}</Chip>
        <Chip active={activeTab === "accessibility"} className="settings-tab-chip" onClick={() => setActiveTab("accessibility")}>{t("nav.accessibilityShort")}</Chip>
        <Chip active={activeTab === "extensions"} className="settings-tab-chip" onClick={() => setActiveTab("extensions")}>{t("nav.extensions")}</Chip>
        <Chip active={activeTab === "console"} className="settings-tab-chip" onClick={() => setActiveTab("console")}>{t("nav.console")}</Chip>
        {slotContributions.map((c) => (
          <Chip key={c.contribution.id} active={activeTab === c.contribution.id} className="settings-tab-chip" onClick={() => setActiveTab(c.contribution.id)}>
            {t(c.contribution.title || c.contribution.id)}
          </Chip>
        ))}
        {configExtensions.map((ext) => (
          <Chip key={`config-${ext.id}`} active={activeTab === `config-${ext.id}`} className="settings-tab-chip" onClick={() => setActiveTab(`config-${ext.id}`)}>
            {t(ext.manifest.name || ext.id)}
          </Chip>
        ))}
      </div>
    </div>
  );
};

export const SettingsSidebarNav: React.FC<SettingsNavigationProps> = ({
  activeTab,
  setActiveTab,
  slotContributions,
  configExtensions,
}) => {
  const { t } = useTranslation("settings");

  return (
    <>
      <div className="settings-brand">
        <h1 className="settings-brand-title">{t("nav.brandTitle")}</h1>
        <p className="settings-brand-desc">{t("nav.brandDesc")}</p>
      </div>
      <div className="settings-divider" />
      <div className="settings-section-title">{t("nav.groupApp")}</div>
      <Button
        variant="ghost"
        className={`settings-nav-item ${activeTab === "general" ? "active" : ""}`}
        onClick={() => setActiveTab("general")}
      >
        <Sliders size="1rem" />
        <span>{t("nav.general")}</span>
      </Button>
      <Button
        variant="ghost"
        className={`settings-nav-item ${activeTab === "profiles" ? "active" : ""}`}
        onClick={() => setActiveTab("profiles")}
      >
        <Globe size="1rem" />
        <span>{t("nav.connections")}</span>
      </Button>
      <Button
        variant="ghost"
        className={`settings-nav-item ${activeTab === "accessibility" ? "active" : ""}`}
        onClick={() => setActiveTab("accessibility")}
      >
        <Eye size="1rem" />
        <span>{t("nav.accessibility")}</span>
      </Button>

      <div className="settings-section-title">{t("nav.groupIntegrations")}</div>
      <Button
        variant="ghost"
        className={`settings-nav-item ${activeTab === "extensions" ? "active" : ""}`}
        onClick={() => setActiveTab("extensions")}
      >
        <Puzzle size="1rem" />
        <span>{t("nav.extensions")}</span>
      </Button>
      <Button
        variant="ghost"
        className={`settings-nav-item ${activeTab === "console" ? "active" : ""}`}
        onClick={() => setActiveTab("console")}
      >
        <Terminal size="1rem" />
        <span>{t("nav.console")}</span>
      </Button>

      {(slotContributions.length > 0 || configExtensions.length > 0) && (
        <>
          <div className="settings-section-title">{t("nav.groupPlugins")}</div>
          {slotContributions.map((c) => (
            <Button
              variant="ghost"
              key={c.contribution.id}
              className={`settings-nav-item ${activeTab === c.contribution.id ? "active" : ""}`}
              onClick={() => setActiveTab(c.contribution.id)}
            >
              <Puzzle size="1rem" />
              <span>{c.contribution.title || c.contribution.id}</span>
            </Button>
          ))}
          {configExtensions.map((ext) => (
            <Button
              variant="ghost"
              key={`config-${ext.id}`}
              className={`settings-nav-item ${activeTab === `config-${ext.id}` ? "active" : ""}`}
              onClick={() => setActiveTab(`config-${ext.id}`)}
            >
              <Puzzle size="1rem" />
              <span>{t(ext.manifest.name || ext.id)}</span>
            </Button>
          ))}
        </>
      )}
    </>
  );
};
import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders, Puzzle, Globe, Terminal, Eye, Search, ShieldUser } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import type { SlotContribution } from "@potok/sdk-types";

type SettingsSlotEntry = { contribution: SlotContribution; pluginId: string };
import { Button, Chip, Input } from "../ui";

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
        <Chip active={activeTab === "account"} className="settings-tab-chip" onClick={() => setActiveTab("account")}>{t("nav.account")}</Chip>
        <Chip active={activeTab === "profiles"} className="settings-tab-chip" onClick={() => setActiveTab("profiles")}>{t("nav.connectionsShort")}</Chip>
        <Chip active={activeTab === "accessibility"} className="settings-tab-chip" onClick={() => setActiveTab("accessibility")}>{t("nav.accessibilityShort")}</Chip>
        <Chip active={activeTab === "extensions"} className="settings-tab-chip potok-safeguard" onClick={() => setActiveTab("extensions")}>{t("nav.extensions")}</Chip>
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

type NavItem = { id: string; icon: LucideIcon; label: string };
type NavGroup = { label: string; items: NavItem[] };

export const SettingsSidebarNav: React.FC<SettingsNavigationProps> = ({
  activeTab,
  setActiveTab,
  slotContributions,
  configExtensions,
}) => {
  const { t } = useTranslation("settings");
  const [query, setQuery] = React.useState("");

  const pluginItems: NavItem[] = [
    ...slotContributions.map((c) => ({
      id: c.contribution.id,
      icon: Puzzle,
      label: c.contribution.title || c.contribution.id,
    })),
    ...configExtensions.map((ext) => ({
      id: `config-${ext.id}`,
      icon: Puzzle,
      label: t(ext.manifest.name || ext.id),
    })),
  ];

  const groups: NavGroup[] = [
    {
      label: t("nav.groupApp"),
      items: [
        { id: "general", icon: Sliders, label: t("nav.general") },
        { id: "account", icon: ShieldUser, label: t("nav.account") },
        { id: "profiles", icon: Globe, label: t("nav.connections") },
        { id: "accessibility", icon: Eye, label: t("nav.accessibility") },
      ],
    },
    {
      label: t("nav.groupIntegrations"),
      items: [
        { id: "extensions", icon: Puzzle, label: t("nav.extensions") },
        { id: "console", icon: Terminal, label: t("nav.console") },
      ],
    },
    ...(pluginItems.length ? [{ label: t("nav.groupPlugins"), items: pluginItems }] : []),
  ];

  const q = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((g) => ({ ...g, items: q ? g.items.filter((i) => i.label.toLowerCase().includes(q)) : g.items }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <div className="settings-brand">
        <h1 className="settings-brand-title">{t("nav.brandTitle")}</h1>
        <p className="settings-brand-desc">{t("nav.brandDesc")}</p>
      </div>

      <div className="settings-nav-search">
        <Search size="0.9rem" aria-hidden="true" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("nav.searchPlaceholder")}
          aria-label={t("nav.searchPlaceholder")}
        />
      </div>

      <div className="settings-divider" />

      {visibleGroups.map((group) => (
        <React.Fragment key={group.label}>
          <div className="settings-nav-group">{group.label}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                variant="ghost"
                key={item.id}
                className={`settings-nav-item ${activeTab === item.id ? "active" : ""} ${item.id === "extensions" ? "potok-safeguard" : ""}`.trim()}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size="1rem" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </React.Fragment>
      ))}

      {q && visibleGroups.length === 0 && (
        <div className="settings-nav-empty">{t("nav.noResults")}</div>
      )}
    </>
  );
};
import React from "react";
import { useTranslation } from "react-i18next";
import { Sliders, Puzzle, Globe, Eye, ShieldUser } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import type { SlotContribution } from "@potok/sdk-types";

type SettingsSlotEntry = { contribution: SlotContribution; pluginId: string };
import { Button } from "../ui";

interface SettingsNavigationProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  slotContributions: SettingsSlotEntry[];
  configExtensions: RegisteredExtension[];
}

type NavItem = { id: string; icon: LucideIcon; label: string };
type NavGroup = { label: string; items: NavItem[] };

export const SettingsSidebarNav: React.FC<SettingsNavigationProps> = ({
  activeSection,
  onNavigate,
  slotContributions,
  configExtensions,
}) => {
  const { t } = useTranslation("settings");

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
      items: [{ id: "extensions", icon: Puzzle, label: t("nav.extensions") }],
    },
    ...(pluginItems.length ? [{ label: t("nav.groupPlugins"), items: pluginItems }] : []),
  ];

  return (
    <nav className="settings-nav" aria-label={t("nav.brandTitle")}>
      {groups.map((group) => (
        <React.Fragment key={group.label}>
          <div className="settings-nav-group">{group.label}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                variant="ghost"
                type="button"
                key={item.id}
                className={`settings-nav-item ${activeSection === item.id ? "active" : ""} ${item.id === "extensions" ? "potok-safeguard" : ""}`.trim()}
                aria-current={activeSection === item.id ? "location" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size="1rem" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
};

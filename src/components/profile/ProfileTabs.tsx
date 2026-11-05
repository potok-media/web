import React from "react";
import { Button } from "../ui";
import type { TitleStatus } from "../../utils/userData";

export type ProfileTabId = "continue" | TitleStatus;

export interface ProfileTabDef {
  id: ProfileTabId;
  label: string;
  count?: number;
}

interface ProfileTabsProps {
  tabs: ProfileTabDef[];
  active: ProfileTabId;
  onChange: (tab: ProfileTabId) => void;
}

/**
 * Text tab bar directly under the hero (approved mockup): label + small count badge per tab,
 * active tab = text color + a 2px accent underline on the row's bottom border. Not pills.
 * The row scrolls horizontally on narrow screens. Zero counts render no badge.
 */
export const ProfileTabs: React.FC<ProfileTabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="profile-tabs" role="tablist">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          role="tab"
          aria-selected={active === tab.id}
          className={`profile-tab${active === tab.id ? " profile-tab--active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="profile-tab-label">{tab.label}</span>
          {tab.count != null && tab.count > 0 && (
            <span className="profile-tab-count">{tab.count}</span>
          )}
        </Button>
      ))}
    </div>
  );
};

export default ProfileTabs;

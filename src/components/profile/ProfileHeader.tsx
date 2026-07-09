import React from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { IconButton } from "../ui";

interface ProfileHeaderProps {
  username?: string;
  syncStrategy: string;
  onLogout: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  username,
  syncStrategy,
  onLogout,
}) => {
  const { t } = useTranslation("profile");

  return (
    <div className="profile-header-wrap">
      <div>
        <div className="profile-title-row">
          <h1 className="profile-hero-title">{t("page.title")}</h1>
          <Link to="/settings" className="profile-mobile-settings-btn" title={t("page.settings")}>
            <Settings size="1.25rem" />
          </Link>
        </div>
        <span className="profile-subtitle">
          {t("page.subtitle")}
        </span>
      </div>
      <div className="profile-user-card profile-shrink-zero">
        <div className="profile-avatar">
          {username?.substring(0, 1).toUpperCase() || "U"}
        </div>
        <div>
          <div className="profile-username-label">
            {username || t("page.defaultUser")}
          </div>
          <div className="profile-strategy-label">
            {syncStrategy === "trakt" ? t("page.strategyLabel.trakt") : syncStrategy === "server" ? t("page.strategyLabel.server") : t("page.strategyLabel.none")}
          </div>
        </div>
        <IconButton
          onClick={onLogout}
          className="profile-logout-btn"
          title={t("page.logout")}
          aria-label={t("page.logout")}
        >
          <LogOut size="1rem" />
        </IconButton>
      </div>
    </div>
  );
};
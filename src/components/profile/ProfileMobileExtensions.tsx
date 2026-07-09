import React from "react";
import { useTranslation } from "react-i18next";
import { Slot } from "../common/extension/Slot";

export const ProfileMobileExtensions: React.FC = () => {
  const { t } = useTranslation("profile");

  return (
    <div className="profile-mobile-extensions-section">
      <h2 className="profile-extensions-heading">{t("page.extensions.heading")}</h2>
      <p className="profile-extensions-subheading">{t("page.extensions.subheading")}</p>
      <div className="profile-extensions-grid-wrapper">
        <Slot name="sidebar-menu-home" props={{ isCollapsed: false }} className="profile-slot-gap" />
        <Slot name="sidebar-menu-library" props={{ isCollapsed: false }} className="profile-slot-gap" />
        <Slot name="sidebar-menu" props={{ isCollapsed: false }} />
      </div>
    </div>
  );
};
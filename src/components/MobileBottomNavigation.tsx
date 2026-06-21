import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, Search, Play, User } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";

export const MobileBottomNavigation: React.FC = () => {
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();

  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!potokToken) {
      e.preventDefault();
      showHUD("warning", t("protectedLoginRequired"));
      navigate("/profile");
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`} end>
        <Home size="1.25rem" />
        <span>{t("home")}</span>
      </NavLink>

      <NavLink to="/search" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}>
        <Search size="1.25rem" />
        <span>{t("search")}</span>
      </NavLink>

      <NavLink
        to="/calendar"
        className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
        onClick={handleProtectedClick}
      >
        <Calendar size="1.25rem" />
        <span>{t("calendar")}</span>
      </NavLink>

      <NavLink
        to="/library/up-next"
        className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
        onClick={handleProtectedClick}
      >
        <Play size="1.25rem" />
        <span>{t("mobileLibrary")}</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}>
        <User size="1.25rem" />
        <span>{t("mobileAccount")}</span>
      </NavLink>
    </nav>
  );
};

export default MobileBottomNavigation;


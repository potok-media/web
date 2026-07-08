import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, User, Settings, Play, Bookmark, Star, Clock, PanelLeft, PanelLeftClose } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import SidebarStatus from "./SidebarStatus";
import SidebarSearch from "./SidebarSearch";
import { Slot } from "./common/extension/Slot";
import "../styles/sidebar.css";

interface FocusableNavLinkProps {
  to: string;
  className: (props: { isActive: boolean }) => string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  end?: boolean;
}

const FocusableNavLink: React.FC<FocusableNavLinkProps> = ({ to, className, onClick, children, end }) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={className}
      onClick={onClick}
    >
      {children}
    </NavLink>
  );
};

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  pathname: string;
  search: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = React.memo(
  ({ isCollapsed, onToggle, pathname, search }) => {
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getNavLinkClass = (isActive: boolean, extraClasses = "") => {
    const isLinkActive = isActive && !isSearchFocused;
    return `sidebar-nav-item ${isLinkActive ? "active" : ""} ${extraClasses}`.trim();
  };

  const navigateDebounceTimer = useRef<any>(null);

  const queryParam = useMemo(() => {
    return new URLSearchParams(search).get("q") || "";
  }, [search]);

  useEffect(() => {
    if (pathname === "/search") {
      setSidebarSearch(queryParam);
    } else {
      setSidebarSearch("");
    }
  }, [pathname, queryParam]);

  useEffect(() => {
    return () => {
      if (navigateDebounceTimer.current) {
        clearTimeout(navigateDebounceTimer.current);
      }
    };
  }, []);

  const handleSidebarSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSidebarSearch(val);

    if (navigateDebounceTimer.current) {
      clearTimeout(navigateDebounceTimer.current);
    }

    navigateDebounceTimer.current = setTimeout(() => {
      if (val.trim()) {
        navigate(`/search?q=${encodeURIComponent(val.trim())}`);
      } else {
        navigate("/search");
      }
    }, 300);
  };

  const handleClearSidebarSearch = () => {
    if (navigateDebounceTimer.current) {
      clearTimeout(navigateDebounceTimer.current);
    }
    setSidebarSearch("");
    navigate("/search");
    inputRef.current?.focus();
  };

  const handleProtectedClick = (e: React.MouseEvent) => {
    if (!potokToken) {
      e.preventDefault();
      showHUD("warning", t("protectedLoginRequired"));
      navigate("/profile");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={isCollapsed ? t("expandMenu") : t("collapseMenu")}
        >
          {isCollapsed ? <PanelLeft size="1.125rem" /> : <PanelLeftClose size="1.125rem" />}
        </button>
        {!isCollapsed && (
          <FocusableNavLink to="/profile" className={({ isActive }) => getNavLinkClass(isActive, "sidebar-profile-header-btn")}>
            <User size="1.125rem" />
          </FocusableNavLink>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <SidebarSearch
            isCollapsed={isCollapsed}
            sidebarSearch={sidebarSearch}
            onSearchChange={handleSidebarSearchChange}
            onClear={handleClearSidebarSearch}
            inputRef={inputRef}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />

          {isCollapsed && (
            <FocusableNavLink to="/profile" className={({ isActive }) => getNavLinkClass(isActive)}>
              <User size="1.125rem" />
              <span>{t("profile")}</span>
            </FocusableNavLink>
          )}
          <FocusableNavLink to="/" className={({ isActive }) => getNavLinkClass(isActive)} end>
            <Home size="1.125rem" />
            <span>{t("home")}</span>
          </FocusableNavLink>
          <Slot name="sidebar-menu-home" props={{ isCollapsed }} />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">{t("library")}</div>
          <FocusableNavLink
            to="/library/up-next"
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Play size="1.125rem" />
            <span>{t("upNext")}</span>
          </FocusableNavLink>
          <FocusableNavLink
            to="/calendar"
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Calendar size="1.125rem" />
            <span>{t("calendar")}</span>
          </FocusableNavLink>
          <FocusableNavLink
            to="/library/watchlist"
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Bookmark size="1.125rem" />
            <span>{t("watchlist")}</span>
          </FocusableNavLink>
          <FocusableNavLink
            to="/library/favorites"
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Star size="1.125rem" />
            <span>{t("favorites")}</span>
          </FocusableNavLink>
          <FocusableNavLink
            to="/library/history"
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Clock size="1.125rem" />
            <span>{t("history")}</span>
          </FocusableNavLink>
          <Slot name="sidebar-menu-library" props={{ isCollapsed }} />
        </div>

        <div className="sidebar-section">
          <FocusableNavLink to="/settings" className={({ isActive }) => getNavLinkClass(isActive)}>
            <Settings size="1.125rem" />
            <span>{t("settings")}</span>
          </FocusableNavLink>
          <Slot name="sidebar-menu" props={{ isCollapsed }} />
        </div>
      </nav>

      <SidebarStatus />
    </aside>
  );
}, (prevProps, nextProps) => {
  const isSearchRouteTransition =
    prevProps.pathname === "/search" ||
    nextProps.pathname === "/search";
  if (isSearchRouteTransition) {
    return prevProps.isCollapsed === nextProps.isCollapsed && prevProps.onToggle === nextProps.onToggle && prevProps.pathname === nextProps.pathname && prevProps.search === nextProps.search;
  }
  return prevProps.isCollapsed === nextProps.isCollapsed && prevProps.onToggle === nextProps.onToggle && prevProps.pathname === nextProps.pathname;
});

export default AppSidebar;

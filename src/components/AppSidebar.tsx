import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, User, Settings, Play, Bookmark, Star, Clock, PanelLeft, PanelLeftClose } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import SidebarStatus from "./SidebarStatus";
import SidebarSearch from "./SidebarSearch";
import { Focusable, FocusableButton } from "./common/TVNavigation";
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { Slot } from "./common/extension/Slot";
import "../styles/sidebar.css";

interface FocusableNavLinkProps {
  to: string;
  className: (props: { isActive: boolean }) => string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  end?: boolean;
  focusKey?: string;
}

const FocusableNavLink: React.FC<FocusableNavLinkProps> = ({ to, className, onClick, children, end, focusKey }) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Focusable
      focusKey={focusKey}
      onEnterPress={() => {
        linkRef.current?.click();
      }}
    >
      {({ ref: focusRef, focused }) => {
        const setRefs = (node: HTMLAnchorElement | null) => {
          linkRef.current = node;
          (focusRef as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
        };
        return (
          <NavLink
            ref={setRefs}
            to={to}
            end={end}
            className={(props) => `${className(props)} ${focused ? "focused" : ""}`}
            onClick={onClick}
          >
            {children}
          </NavLink>
        );
      }}
    </Focusable>
  );
};

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  pathname: string;
  search: string;
  onFocusChange?: (focused: boolean) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = React.memo(
  ({ isCollapsed, onToggle, pathname, search, onFocusChange }) => {
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("sidebar");
  const navigate = useNavigate();

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Which nav item maps to the current route.
  const activeKey = useMemo(() => {
    if (pathname.startsWith("/profile")) return "SIDEBAR_PROFILE";
    if (pathname === "/") return "SIDEBAR_HOME";
    if (pathname.startsWith("/library/up-next")) return "SIDEBAR_UPNEXT";
    if (pathname.startsWith("/calendar")) return "SIDEBAR_CALENDAR";
    if (pathname.startsWith("/library/watchlist")) return "SIDEBAR_WATCHLIST";
    if (pathname.startsWith("/library/favorites")) return "SIDEBAR_FAVORITES";
    if (pathname.startsWith("/library/history")) return "SIDEBAR_HISTORY";
    if (pathname.startsWith("/settings")) return "SIDEBAR_SETTINGS";
    return "SIDEBAR_HOME";
  }, [pathname]);

  // The sidebar is a spatial-navigation container. `hasFocusedChild` is the single,
  // authoritative "is the sidebar focused" signal (norigin tracks subtree focus
  // correctly across blur/focus ordering — no manual counting/debouncing needed).
  const { ref: sidebarRef, hasFocusedChild } = useFocusable({
    focusKey: "SIDEBAR",
    trackChildren: true,
    focusable: false,
    saveLastFocusedChild: false,
    isFocusBoundary: false,
    preferredChildFocusKey: activeKey,
  });

  // Drive the expand/collapse state in the parent layout.
  useEffect(() => {
    onFocusChange?.(hasFocusedChild);
  }, [hasFocusedChild, onFocusChange]);

  // On ENTRY (focus crosses into the sidebar from outside), jump to the active
  // section's item.
  const prevHasFocus = useRef(false);
  useEffect(() => {
    if (hasFocusedChild && !prevHasFocus.current) {
      setFocus(activeKey);
    }
    prevHasFocus.current = hasFocusedChild;
  }, [hasFocusedChild, activeKey]);

  const getNavLinkClass = (isActive: boolean, extraClasses = "") => {
    const isLinkActive = isActive && !isSearchFocused;
    return `sidebar-nav-item ${isLinkActive ? "active" : ""} ${extraClasses}`.trim();
  };

  const navigateDebounceTimer = useRef<any>(null);

  // Sync sidebar search input with URL search param when on search page
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
    <FocusContext.Provider value="SIDEBAR">
      <aside ref={sidebarRef as React.RefObject<HTMLElement>} className="sidebar">
        <div className="sidebar-header">
          <FocusableButton
            className="sidebar-toggle-btn"
            onClick={onToggle}
            title={isCollapsed ? t("expandMenu") : t("collapseMenu")}
          >
            {isCollapsed ? <PanelLeft size="1.125rem" /> : <PanelLeftClose size="1.125rem" />}
          </FocusableButton>
          {!isCollapsed && (
            <FocusableNavLink to="/profile" focusKey="SIDEBAR_PROFILE" className={({ isActive }) => getNavLinkClass(isActive, "sidebar-profile-header-btn")}>
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
              <FocusableNavLink to="/profile" focusKey="SIDEBAR_PROFILE" className={({ isActive }) => getNavLinkClass(isActive)}>
                <User size="1.125rem" />
                <span>{t("profile")}</span>
              </FocusableNavLink>
            )}
            <FocusableNavLink to="/" focusKey="SIDEBAR_HOME" className={({ isActive }) => getNavLinkClass(isActive)} end>
              <Home size="1.125rem" />
              <span>{t("home")}</span>
            </FocusableNavLink>
            <Slot name="sidebar-menu-home" props={{ isCollapsed }} />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">{t("library")}</div>
            <FocusableNavLink
              to="/library/up-next"
              focusKey="SIDEBAR_UPNEXT"
              className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
              onClick={handleProtectedClick}
            >
              <Play size="1.125rem" />
              <span>{t("upNext")}</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/calendar"
              focusKey="SIDEBAR_CALENDAR"
              className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
              onClick={handleProtectedClick}
            >
              <Calendar size="1.125rem" />
              <span>{t("calendar")}</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/library/watchlist"
              focusKey="SIDEBAR_WATCHLIST"
              className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
              onClick={handleProtectedClick}
            >
              <Bookmark size="1.125rem" />
              <span>{t("watchlist")}</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/library/favorites"
              focusKey="SIDEBAR_FAVORITES"
              className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
              onClick={handleProtectedClick}
            >
              <Star size="1.125rem" />
              <span>{t("favorites")}</span>
            </FocusableNavLink>
            <FocusableNavLink
              to="/library/history"
              focusKey="SIDEBAR_HISTORY"
              className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
              onClick={handleProtectedClick}
            >
              <Clock size="1.125rem" />
              <span>{t("history")}</span>
            </FocusableNavLink>
            <Slot name="sidebar-menu-library" props={{ isCollapsed }} />
          </div>

          <div className="sidebar-section">
            <FocusableNavLink to="/settings" focusKey="SIDEBAR_SETTINGS" className={({ isActive }) => getNavLinkClass(isActive)}>
              <Settings size="1.125rem" />
              <span>{t("settings")}</span>
            </FocusableNavLink>
            <Slot name="sidebar-menu" props={{ isCollapsed }} />
          </div>
        </nav>

        <SidebarStatus />
      </aside>
    </FocusContext.Provider>
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

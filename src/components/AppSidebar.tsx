import React, { useState, useEffect, useRef, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Calendar, User, Settings, Play, Bookmark, Star, Clock, PanelLeft, PanelLeftClose } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import SidebarStatus from "./SidebarStatus";
import SidebarSearch from "./SidebarSearch";
import { Focusable, FocusableButton } from "./common/TVNavigation";
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
}

export const AppSidebar: React.FC<AppSidebarProps> = React.memo(
  ({ isCollapsed, onToggle, pathname, search }) => {
  const { potokToken } = useAuth();
  const { show: showHUD } = useHUD();
  const navigate = useNavigate();

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      showHUD("warning", "Пожалуйста, войдите в аккаунт Potok для доступа к разделу");
      navigate("/profile");
    }
  };

  return (
    <aside 
      className="sidebar"
    >
      <div className="sidebar-header">
        <FocusableButton 
          className="sidebar-toggle-btn" 
          onClick={onToggle} 
          title={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </FocusableButton>
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

          <FocusableNavLink to="/profile" className={({ isActive }) => getNavLinkClass(isActive)}>
            <User size={18} />
            <span>Профиль</span>
          </FocusableNavLink>
          <FocusableNavLink to="/" focusKey="SIDEBAR_HOME" className={({ isActive }) => getNavLinkClass(isActive)} end>
            <Home size={18} />
            <span>Главная</span>
          </FocusableNavLink>
          <Slot name="sidebar-menu-home" props={{ isCollapsed }} />
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Медиатека</div>
          <FocusableNavLink 
            to="/library/up-next" 
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Play size={18} />
            <span>Продолжить</span>
          </FocusableNavLink>
          <FocusableNavLink 
            to="/calendar" 
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Calendar size={18} />
            <span>Расписание</span>
          </FocusableNavLink>
          <FocusableNavLink 
            to="/library/watchlist" 
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Bookmark size={18} />
            <span>Запланировано</span>
          </FocusableNavLink>
          <FocusableNavLink 
            to="/library/favorites" 
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Star size={18} />
            <span>Избранное</span>
          </FocusableNavLink>
          <FocusableNavLink 
            to="/library/history" 
            className={({ isActive }) => getNavLinkClass(isActive, !potokToken ? "disabled" : "")}
            onClick={handleProtectedClick}
          >
            <Clock size={18} />
            <span>История</span>
          </FocusableNavLink>
          <Slot name="sidebar-menu-library" props={{ isCollapsed }} />
        </div>

        <div className="sidebar-section">
          <FocusableNavLink to="/settings" className={({ isActive }) => getNavLinkClass(isActive)}>
            <Settings size={18} />
            <span>Настройки</span>
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
  return prevProps.isCollapsed === nextProps.isCollapsed && prevProps.onToggle === nextProps.onToggle;
});

export default AppSidebar;

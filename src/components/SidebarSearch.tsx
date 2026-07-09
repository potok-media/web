import React from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { IconButton, Input } from "./ui";

interface SidebarSearchProps {
  isCollapsed: boolean;
  sidebarSearch: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocus: () => void;
  onBlur: () => void;
}

export const SidebarSearch: React.FC<SidebarSearchProps> = React.memo(({
  isCollapsed,
  sidebarSearch,
  onSearchChange,
  onClear,
  inputRef,
  onFocus,
  onBlur,
}) => {
  const { t } = useTranslation("sidebar");
  if (isCollapsed) {
    return (
      <NavLink 
        to="/search" 
        className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`} 
        title={t("search")}
      >
        <Search size="1.125rem" />
      </NavLink>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="sidebar-search-form">
      <div className="sidebar-search-wrap">
        <Search size="1rem" className="sidebar-search-icon" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={t("searchPlaceholder")}
          value={sidebarSearch}
          onChange={onSearchChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className="sidebar-search-input"
        />
        {sidebarSearch && (
          <IconButton
            onClick={onClear}
            className="sidebar-search-clear"
            title={t("clear")}
            aria-label={t("clear")}
          >
            <X size="0.875rem" />
          </IconButton>
        )}
      </div>
    </form>
  );
});

SidebarSearch.displayName = "SidebarSearch";
export default SidebarSearch;

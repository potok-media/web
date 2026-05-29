import React from "react";
import { Search, X } from "lucide-react";
import { NavLink } from "react-router-dom";

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
  if (isCollapsed) {
    return (
      <NavLink 
        to="/search" 
        className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`} 
        title="Поиск"
      >
        <Search size={18} />
      </NavLink>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="sidebar-search-form">
      <div className="sidebar-search-wrap">
        <Search size={16} className="sidebar-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск..."
          value={sidebarSearch}
          onChange={onSearchChange}
          onFocus={onFocus}
          onBlur={onBlur}
          className="sidebar-search-input"
        />
        {sidebarSearch && (
          <button 
            type="button" 
            onClick={onClear} 
            className="sidebar-search-clear"
            title="Очистить"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </form>
  );
});

SidebarSearch.displayName = "SidebarSearch";
export default SidebarSearch;

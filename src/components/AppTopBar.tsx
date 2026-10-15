import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Search, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { usePlayback } from "../context/PlaybackContext";
import { useWatchTogether } from "../context/watchTogetherState";
import { mediaCardLink } from "../utils/mediaLink";
import { rememberSearch } from "../utils/recentSearches";
import { AppMenuPopover } from "./AppMenuPopover";
import { getTopbarSearchDestination } from "./appTopBarSearchBehavior";
import { TOPBAR_NAVIGATION_ITEMS } from "./appNavigation";
import { SearchDropdown } from "./search/SearchDropdown";
import { IconButton, Input, cx } from "./ui";
import { WatchTogetherTopBarRoom } from "./watchTogether/WatchTogetherTopBarRoom";
import "../styles/search.css";
import "../styles/topbar.css";

export const AppTopBar: React.FC = React.memo(() => {
  const { t } = useTranslation("sidebar");
  const { potokToken } = useAuth();
  const { activePlayback } = usePlayback();
  const watchTogether = useWatchTogether();
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const showRoomHeader = Boolean(
    activePlayback && watchTogether.role && watchTogether.sessionActive,
  );

  const queryParam = useMemo(
    () => new URLSearchParams(location.search).get("q") || "",
    [location.search],
  );

  useEffect(() => {
    setSearchValue(location.pathname === "/search" ? queryParam : "");
  }, [location.pathname, queryParam]);

  const closeSearch = useCallback(() => {
    setIsSearchFocused(false);
    inputRef.current?.blur();
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(event.target.value);
  }, []);

  const handleSearchSubmit = useCallback((event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    inputRef.current?.focus();
  }, []);

  const handlePickCard = useCallback((item: Parameters<typeof mediaCardLink>[0]) => {
    if (searchValue.trim()) rememberSearch(searchValue);
    closeSearch();
    navigate(mediaCardLink(item));
  }, [closeSearch, navigate, searchValue]);

  const handleShowAll = useCallback((value: string) => {
    const destination = getTopbarSearchDestination("show-all", value);
    if (!destination) return;

    rememberSearch(value.trim());
    closeSearch();
    navigate(destination);
  }, [closeSearch, navigate]);

  const handlePickRecent = useCallback((value: string) => {
    setSearchValue(value);
    inputRef.current?.focus();
  }, []);

  return (
    <header className="app-topbar">
      <div className="app-topbar__inner">
        {showRoomHeader && activePlayback ? (
          <WatchTogetherTopBarRoom playback={activePlayback} />
        ) : (
          <>
            <NavLink to="/" className="app-topbar__brand" aria-label={t("home")}>
              Potok
            </NavLink>

            {potokToken ? (
              <nav className="app-topbar__nav">
                {TOPBAR_NAVIGATION_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => cx(
                      "app-topbar__nav-link",
                      isActive && "is-active",
                    )}
                  >
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
            ) : null}

            <div className="app-topbar__actions">
              <AppMenuPopover />

              <form className="app-topbar-search" role="search" onSubmit={handleSearchSubmit}>
            <div className="app-topbar-search__wrap">
              <Search size="1rem" className="app-topbar-search__icon" aria-hidden="true" />
              <Input
                ref={inputRef}
                type="text"
                inputMode="search"
                value={searchValue}
                placeholder={t("searchPlaceholder")}
                aria-label={t("search")}
                autoComplete="off"
                spellCheck={false}
                className="app-topbar-search__input"
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              {searchValue && (
                <IconButton
                  type="button"
                  className="app-topbar-search__clear"
                  title={t("clear")}
                  aria-label={t("clear")}
                  onClick={handleClearSearch}
                >
                  <X size="0.875rem" />
                </IconButton>
              )}
              {isSearchFocused && (
                <SearchDropdown
                  query={searchValue}
                  onPickCard={handlePickCard}
                  onShowAll={handleShowAll}
                  onPickRecent={handlePickRecent}
                  onClose={closeSearch}
                />
              )}
            </div>
              </form>

              <NavLink
                to="/profile"
                className={({ isActive }) => cx("app-topbar__profile", isActive && "is-active")}
                title={t("profile")}
                aria-label={t("profile")}
              >
                <UserRound size="1.125rem" />
              </NavLink>
            </div>
          </>
        )}
      </div>
    </header>
  );
});

AppTopBar.displayName = "AppTopBar";

export default AppTopBar;

import { mediaCardKey } from "../../utils/mediaLink";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, X } from "lucide-react";
import { useMediaSearch } from "../../hooks/useMediaSearch";
import { getRecentSearches, removeRecentSearch } from "../../utils/recentSearches";
import type { MediaCard } from "../../network/ApiTypes";
import { Button } from "../ui";
import { SearchResultRow } from "./SearchResultRow";

interface SearchDropdownProps {
  query: string;
  onPickCard: (item: MediaCard) => void;
  onShowAll: (query: string) => void;
  onPickRecent: (query: string) => void;
  onClose: () => void;
}

const MAX_ROWS = 8;

/**
 * The search-as-you-type panel under the sidebar input: debounced rich results with match
 * highlights, recent searches when the input is empty, and full keyboard control
 * (ArrowUp/Down cycles, Enter opens the active row, Escape closes).
 */
export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  query,
  onPickCard,
  onShowAll,
  onPickRecent,
  onClose,
}) => {
  const { t } = useTranslation("media");
  const trimmed = query.trim();
  const { results, found, loading } = useMediaSearch(trimmed);
  const rows = useMemo(() => results.slice(0, MAX_ROWS), [results]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<string[]>(() => getRecentSearches());

  useEffect(() => {
    setActiveIndex(rows.length > 0 ? 0 : -1);
  }, [rows]);

  useEffect(() => {
    if (!trimmed) setRecents(getRecentSearches());
  }, [trimmed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (rows.length === 0) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex(index => (index + 1) % rows.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(index => (index <= 0 ? rows.length - 1 : index - 1));
      } else if (event.key === "Enter") {
        if (event.target instanceof HTMLElement && event.target.closest(".search-dropdown-show-all")) {
          return;
        }
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < rows.length) {
          onPickCard(rows[activeIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, activeIndex, trimmed, onPickCard, onShowAll, onClose]);

  // Clicks inside the panel must not blur the sidebar input (blur closes the dropdown).
  // An empty panel (no query, no recents) is never rendered — a bare frame looks broken.
  if (!trimmed && recents.length === 0) return null;

  return (
    <div className="search-dropdown" onMouseDown={event => event.preventDefault()}>
      {!trimmed && recents.length > 0 && (
        <div className="search-dropdown-section">
          <div className="search-dropdown-caption">{t("search.recentTitle")}</div>
          {recents.map(entry => (
            <div key={entry} className="search-recent-row" onClick={() => onPickRecent(entry)}>
              <Clock size="0.875rem" className="search-recent-icon" />
              <span className="search-recent-text">{entry}</span>
              <span
                className="search-recent-remove"
                role="button"
                aria-label={t("library.clearSearch")}
                onClick={event => {
                  event.stopPropagation();
                  setRecents(removeRecentSearch(entry));
                }}
              >
                <X size="0.75rem" />
              </span>
            </div>
          ))}
        </div>
      )}

      {trimmed && loading && rows.length === 0 && (
        <div className="search-dropdown-caption search-dropdown-status">{t("library.searching")}</div>
      )}

      {trimmed && !loading && rows.length === 0 && (
        <div className="search-dropdown-caption search-dropdown-status">{t("library.nothingFound")}</div>
      )}

      {rows.map((item, index) => (
        <SearchResultRow
          key={mediaCardKey(item)}
          item={item}
          active={index === activeIndex}
          onHover={() => setActiveIndex(index)}
          onSelect={onPickCard}
        />
      ))}

      {trimmed && rows.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          fullWidth
          className="search-dropdown-show-all"
          onClick={() => onShowAll(trimmed)}
          onMouseEnter={() => setActiveIndex(-1)}
        >
          {t("search.showAll", { count: found })}
        </Button>
      )}
    </div>
  );
};

export default SearchDropdown;

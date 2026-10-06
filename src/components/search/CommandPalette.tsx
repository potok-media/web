import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, Clock, TrendingUp, X } from "lucide-react";
import { Input } from "../ui";
import { useMediaSearch } from "../../hooks/useMediaSearch";
import { ApiClient } from "../../network/ApiClient";
import { getRecentSearches, rememberSearch, removeRecentSearch } from "../../utils/recentSearches";
import { hydrateLocalizedTitles } from "../../utils/localizedTitles";
import type { MediaCard } from "../../network/ApiTypes";
import { mediaCardLink } from "../../utils/mediaLink";
import { SearchResultRow } from "./SearchResultRow";

/**
 * Global command palette (Cmd/Ctrl+K or "/"): instant index search with keyboard navigation,
 * recent searches and the trending slice while the input is empty. Mounted once at the app
 * shell; opens everywhere except while typing in another field.
 */
export const CommandPalette: React.FC = () => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<string[]>([]);
  const [trending, setTrending] = useState<MediaCard[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const trendingRequested = useRef(false);

  const trimmed = query.trim();
  const { results, loading } = useMediaSearch(trimmed);
  const rows = useMemo(() => results.slice(0, 8), [results]);

  useEffect(() => {
    const handleGlobalKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen(open => !open);
      } else if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(-1);
    setRecents(getRecentSearches());
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
    if (!trendingRequested.current) {
      trendingRequested.current = true;
      ApiClient.fetchTrending()
        .then(cards => {
          setTrending(cards);
          hydrateLocalizedTitles(cards, (potokId, title) => {
            setTrending(previous => previous.map(card => (card.potokId === potokId ? { ...card, title } : card)));
          });
        })
        .catch(() => setTrending([]));
    }
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(rows.length > 0 ? 0 : -1);
  }, [rows]);

  if (!isOpen) return null;

  const close = () => setIsOpen(false);
  const openCard = (item: MediaCard) => {
    if (trimmed) rememberSearch(trimmed);
    close();
    navigate(mediaCardLink(item));
  };
  const showAll = () => {
    if (!trimmed) return;
    rememberSearch(trimmed);
    close();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };
  const pickRecent = (entry: string) => setQuery(entry);

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(index => (rows.length === 0 ? -1 : (index + 1) % rows.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => (rows.length === 0 ? -1 : index <= 0 ? rows.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && rows[activeIndex]) {
        openCard(rows[activeIndex]);
      } else {
        showAll();
      }
    }
  };

  // The body renders only when it has something to show — an empty frame under the input
  // (no recents, trending still loading) looks like a broken panel. With a query the body
  // always has content (rows or a status caption).
  const hasBodyContent = trimmed.length > 0 || recents.length > 0 || trending.length > 0;

  return (
    <div className="command-palette-backdrop" onClick={close}>
      <div className="command-palette" onClick={event => event.stopPropagation()}>
        <div className="command-palette-input-wrap">
          <Search size="1rem" className="command-palette-icon" />
          <Input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder={t("search.palettePlaceholder")}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <kbd className="command-palette-kbd">Esc</kbd>
        </div>

        {hasBodyContent && (
        <div className="command-palette-body">
          {!trimmed && recents.length > 0 && (
            <>
              <div className="search-dropdown-caption">{t("search.recentTitle")}</div>
              {recents.map(entry => (
                <div key={entry} className="search-recent-row" onClick={() => pickRecent(entry)}>
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
            </>
          )}

          {!trimmed && trending.length > 0 && (
            <>
              <div className="search-dropdown-caption">
                <TrendingUp size="0.8125rem" /> {t("search.trendingTitle")}
              </div>
              {trending.slice(0, 6).map(item => (
                <SearchResultRow
                  key={`${item.mediaType}:${item.id}`}
                  item={item}
                  active={false}
                  onHover={() => setActiveIndex(-1)}
                  onSelect={openCard}
                />
              ))}
            </>
          )}

          {trimmed && loading && rows.length === 0 && (
            <div className="search-dropdown-caption search-dropdown-status">{t("library.searching")}</div>
          )}
          {trimmed && !loading && rows.length === 0 && (
            <div className="search-dropdown-caption search-dropdown-status">{t("library.nothingFound")}</div>
          )}
          {rows.map((item, index) => (
            <SearchResultRow
              key={`${item.mediaType}:${item.id}`}
              item={item}
              active={index === activeIndex}
              onHover={() => setActiveIndex(index)}
              onSelect={openCard}
            />
          ))}
        </div>
        )}

        {trimmed && rows.length > 0 && (
          <div className="command-palette-footer" onClick={showAll}>
            {t("search.showAll", { count: Math.max(rows.length, 0) })}
            <kbd className="command-palette-kbd">Enter</kbd>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;

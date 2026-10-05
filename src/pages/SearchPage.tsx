import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Search as SearchIcon, Clock, X, ChevronRight } from "lucide-react";
import { useMediaSearch } from "../hooks/useMediaSearch";
import { ApiClient } from "../network/ApiClient";
import { getRecentSearches, rememberSearch, removeRecentSearch } from "../utils/recentSearches";
import { hydrateLocalizedTitles } from "../utils/localizedTitles";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "../components/MediaCardComponent";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Grid } from "../components/common/Grid";
import { Input } from "../components/ui";
import "../styles/search.css";

const SECTION_PREVIEW = 10;

const EmptyResults: React.FC = () => {
  const { t } = useTranslation("media");
  return (
    <div className="library-empty-view results-mode">
      <SearchIcon size="3rem" className="library-empty-icon muted" />
      <h2 className="library-empty-title">{t("library.nothingFound")}</h2>
      <p className="library-empty-subtitle">{t("library.searchNoResultsSub")}</p>
    </div>
  );
};

const CardGrid: React.FC<{ items: MediaCard[] }> = ({ items }) => (
  <Grid className="library-grid">
    {items.map(item => (
      <MediaCardComponent key={`${item.mediaType}:${item.id}`} item={item} />
    ))}
  </Grid>
);

/** One type-filtered grid (the active chip's full result set). Owns its own search hook. */
const SearchTypeGrid: React.FC<{ query: string; type: string }> = ({ query, type }) => {
  const { t } = useTranslation("media");
  const { results, loading } = useMediaSearch(query, type);
  if (loading && results.length === 0) {
    return <LoadingSpinner height="40vh" message={t("library.searching")} />;
  }
  if (results.length === 0) return <EmptyResults />;
  return <CardGrid items={results} />;
};

/** One per-type section of the unfiltered view. Owns its own type-filtered search hook. */
const SearchTypeSection: React.FC<{
  query: string;
  type: string;
  onDrill: (type: string) => void;
}> = ({ query, type, onDrill }) => {
  const { t } = useTranslation("media");
  const { results, loading } = useMediaSearch(query, type);
  if (results.length === 0) return loading ? null : null;
  return (
    <section className="search-section">
      <div className="carousel-header">
        <button
          type="button"
          className="carousel-title-link search-section-link"
          onClick={() => onDrill(type)}
        >
          <h2 className="carousel-title">{t(`search.type.${type}`, { defaultValue: type })}</h2>
          <ChevronRight className="carousel-title-chevron" size="1.25rem" />
        </button>
      </div>
      <CardGrid items={results.slice(0, SECTION_PREVIEW)} />
    </section>
  );
};

/**
 * The full search page. Types are never hardcoded: facet chips and sections are whatever
 * set of types the index actually reports for the query (the gateway answers facets from
 * the live Typesense collection), labels fall back to the raw type value when the locale
 * has no translation for it. Empty query shows recent searches + the trending slice.
 */
export const SearchPage: React.FC = () => {
  const { t } = useTranslation("media");
  const location = useLocation();
  const navigate = useNavigate();
  const initialQuery = new URLSearchParams(location.search).get("q") || "";

  const [input, setInput] = useState(initialQuery);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>(() => getRecentSearches());
  const [trending, setTrending] = useState<MediaCard[] | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = initialQuery; // the URL is the source of truth; input only proposes
  const unfiltered = useMediaSearch(query);

  // The URL drives the query state (back/forward navigation and the sidebar both write it).
  useEffect(() => {
    setInput(initialQuery);
  }, [initialQuery]);

  // The active chip may outlive its type in a new query's facet set — drop it then.
  useEffect(() => {
    if (activeType && !unfiltered.loading && unfiltered.facets.length > 0 &&
        !unfiltered.facets.some(facet => facet.value === activeType)) {
      setActiveType(null);
    }
  }, [activeType, unfiltered.facets, unfiltered.loading]);

  useEffect(() => {
    if (!query) {
      setRecents(getRecentSearches());
      if (trending === null) {
        ApiClient.fetchTrending()
          .then(cards => {
            setTrending(cards);
            // Display titles hydrate from TMDB (index titles are search keys).
            hydrateLocalizedTitles(cards, (potokId, title) => {
              setTrending(previous => previous?.map(card => (card.potokId === potokId ? { ...card, title } : card)) ?? previous);
            });
          })
          .catch(() => setTrending([]));
      }
    }
  }, [query, trending]);

  const pushQuery = (value: string, remember = false) => {
    const trimmed = value.trim();
    if (remember && trimmed) {
      rememberSearch(trimmed);
      setRecents(getRecentSearches());
    }
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search", { replace: true });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (navigateTimer.current) clearTimeout(navigateTimer.current);
    navigateTimer.current = setTimeout(() => pushQuery(value), 300);
  };

  const renderEmptyState = () => (
    <div className="search-empty-state">
      {recents.length > 0 && (
        <section className="search-empty-section">
          <h2 className="search-section-title">{t("search.recentTitle")}</h2>
          <div className="search-recents-chips">
            {recents.map(entry => (
              <span key={entry} className="search-recent-chip" onClick={() => pushQuery(entry, true)}>
                <Clock size="0.8125rem" />
                {entry}
                <span
                  className="search-recent-remove"
                  role="button"
                  aria-label={t("library.clearSearch")}
                  onClick={event => {
                    event.stopPropagation();
                    setRecents(removeRecentSearch(entry));
                  }}
                >
                  <X size="0.6875rem" />
                </span>
              </span>
            ))}
          </div>
        </section>
      )}
      <section className="search-empty-section">
        <h2 className="search-section-title">{t("search.trendingTitle")}</h2>
        {trending === null ? (
          <LoadingSpinner height="20vh" message={t("library.loadingCollection")} size="small" />
        ) : (
          <CardGrid items={trending} />
        )}
      </section>
    </div>
  );

  const renderChips = () => {
    if (!query || unfiltered.facets.length === 0) return null;
    return (
      <div className="search-chips">
        <button
          type="button"
          className={`search-chip${activeType === null ? " is-active" : ""}`}
          onClick={() => setActiveType(null)}
        >
          {t("search.chips.all")}
          <span className="search-chip-count">{unfiltered.found}</span>
        </button>
        {unfiltered.facets.map(facet => (
          <button
            key={facet.value}
            type="button"
            className={`search-chip${activeType === facet.value ? " is-active" : ""}`}
            onClick={() => setActiveType(facet.value)}
          >
            {t(`search.type.${facet.value}`, { defaultValue: facet.value })}
            <span className="search-chip-count">{facet.count}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderResults = () => {
    if (activeType) {
      return <SearchTypeGrid query={query} type={activeType} />;
    }

    if (unfiltered.loading && unfiltered.results.length === 0) {
      return <LoadingSpinner height="40vh" message={t("library.searching")} />;
    }
    if (!unfiltered.loading && unfiltered.found === 0 && unfiltered.results.length === 0) {
      return <EmptyResults />;
    }
    // Facet-less answers come from the live-TMDB fallback (index unavailable/warming):
    // no trustworthy type split exists there, so the flat grid is the honest rendering.
    if (unfiltered.facets.length === 0) {
      return <CardGrid items={unfiltered.results} />;
    }
    return unfiltered.facets.map(facet => (
      <SearchTypeSection
        key={facet.value}
        query={query}
        type={facet.value}
        onDrill={setActiveType}
      />
    ));
  };

  return (
    <div className="library-page-container search-page">
      <header className="search-page-header">
        <div className="search-page-input-wrap">
          <SearchIcon size="1rem" className="search-page-input-icon" />
          <Input
            type="text"
            value={input}
            placeholder={t("library.searchPlaceholder")}
            onChange={event => handleInputChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                if (navigateTimer.current) clearTimeout(navigateTimer.current);
                pushQuery(input, true);
              }
            }}
            className="search-page-input"
          />
        </div>
        {renderChips()}
      </header>
      <main className="library-content-area">{query ? renderResults() : renderEmptyState()}</main>
    </div>
  );
};

export default SearchPage;

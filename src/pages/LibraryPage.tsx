import React, { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { 
  Film, 
  Search as SearchIcon, 
  AlertTriangle,
  X
} from "lucide-react";
import { useLibraryPage } from "../hooks/useLibraryPage";
import { MediaCardComponent } from "../components/MediaCardComponent";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CATEGORY_MAP, DYNAMIC_CATEGORY_TITLES } from "./LibraryConfig";
import { Grid } from "../components/common/Grid";
import { PlatformManager } from "../utils/PlatformManager";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { FocusableInput, FocusableButton } from "../components/common/TVNavigation";
import { PageFrame } from "../components/common/PageFrame";
import { usePlatform } from "../hooks/usePlatform";
import "../styles/media.css";
 
export const LibraryPage: React.FC = () => {
  const { collectionType: routeType } = useParams<{ collectionType: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("media");

  const { isTV } = usePlatform();
  const isSearchPage = location.pathname === "/search";
  const collectionType = isSearchPage ? "search" : (routeType || "");
 
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") || params.get("query") || "";
 
  const isDynamicCategory = collectionType.includes(".");
  const dynamicTitleKey = DYNAMIC_CATEGORY_TITLES[collectionType];
  const rawCategory = CATEGORY_MAP[collectionType];
  const categoryTitle = isDynamicCategory
    ? (dynamicTitleKey ? t(dynamicTitleKey) : t("library.category"))
    : (rawCategory ? t(rawCategory.title) : t("library.category"));

  // Static categories store i18next keys in LibraryConfig; resolve them here so downstream
  // rendering gets localized strings (and re-renders on language change).
  const category = rawCategory
    ? {
        ...rawCategory,
        title: t(rawCategory.title),
        emptyText: t(rawCategory.emptyText),
        emptySub: t(rawCategory.emptySub),
      }
    : isDynamicCategory
    ? {
        title: categoryTitle,
        endpoint: collectionType,
        icon: Film,
        emptyText: t("library.nothingFound"),
        emptySub: t("library.emptyCategorySub"),
      }
    : null;
 
  const {
    items,
    query,
    setQuery,
    loading,
    error,
    refetch,
    page,
    hasMore,
    loadingMore,
    loadNextPage,
  } = useLibraryPage({
    collectionType: category?.endpoint || "",
    isSearchPage,
    initialQuery,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Progressive (chunked) rendering: cap how many cards are mounted at once and grow
  // the window as the user scrolls toward the end. This keeps the DOM small for large
  // collections without unmounting items (spatial navigation needs focusable nodes to
  // stay mounted, so true windowing is avoided).
  const renderChunk = PlatformManager.isTV() ? 18 : 36;
  const [visibleCount, setVisibleCount] = useState(renderChunk);
  const renderSentinelRef = useRef<HTMLDivElement>(null);

  // Reset the render window when the collection or the search query changes
  // (React's recommended "adjust state during render" pattern — no effect needed).
  const resetKey = `${collectionType}|${isSearchPage ? query : ""}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(renderChunk);
  }

  // Grow the render window ahead of the viewport.
  useEffect(() => {
    if (visibleCount >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + renderChunk, items.length));
        }
      },
      { rootMargin: "600px" }
    );
    const el = renderSentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [visibleCount, items.length, renderChunk]);

  // Set the INITIAL focus once per collection/query. Keyed by resetKey so it doesn't re-fire on
  // every items.length change — otherwise each pagination append would yank focus back to the top.
  const focusedForKeyRef = useRef("");
  useEffect(() => {
    if (error && !loading) {
      setFocus("LIBRARY_ERROR_RETRY");
      return;
    }
    if (loading) return;
    if (focusedForKeyRef.current === resetKey) return;
    if (isSearchPage) {
      focusedForKeyRef.current = resetKey;
      setFocus("SEARCH_INPUT");
    } else if (items.length > 0) {
      focusedForKeyRef.current = resetKey;
      // Spatial (D-pad) focus is only meaningful on TV. Forcing focus on the first card on
      // mobile/desktop just draws an unwanted highlight ring.
      if (isTV) {
        restoreFocusOrDefault(location.key || location.pathname, "LIBRARY_FIRST_CARD");
      }
    }
  }, [loading, isSearchPage, items.length, error, resetKey, location.key, location.pathname, isTV]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadNextPage();
        }
      },
      {
        rootMargin: "1200px",
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
    // items.length + visibleCount are in deps so this re-runs once the grid (and the
    // pagination sentinel) actually render — setItems is deferred via startTransition, so on
    // first load the effect would otherwise run while items is still empty and never attach.
  }, [hasMore, page, loading, loadingMore, loadNextPage, items.length, visibleCount]);

  // On TV the page scrolls by transform (PageFrame → TVScrollView), which doesn't fire the
  // IntersectionObserver sentinels above — so pagination is driven by FOCUS instead: when a card
  // near the end of the mounted window gets focused, grow the render window and/or fetch the next
  // page. A ref keeps the latest paging state so the per-card onFocus handler can stay stable.
  const pagingRef = useRef({ visibleCount, itemsLength: items.length, hasMore, page, loading, loadingMore });
  pagingRef.current = { visibleCount, itemsLength: items.length, hasMore, page, loading, loadingMore };
  const NEAR_END = 8; // ≈ one grid row ahead
  const handleCardFocus = useCallback((index: number) => {
    if (!PlatformManager.isTV()) return;
    const p = pagingRef.current;
    if (index >= p.visibleCount - NEAR_END && p.visibleCount < p.itemsLength) {
      setVisibleCount((prev) => Math.min(prev + renderChunk, p.itemsLength));
    }
    if (index >= p.itemsLength - NEAR_END && p.hasMore && !p.loading && !p.loadingMore) {
      loadNextPage();
    }
  }, [renderChunk, loadNextPage]);

  if (error === "trakt_unauthorized") {
    return (
      <div className="library-empty-view">
        <AlertTriangle size="3rem" className="library-empty-icon warning" />
        <h2 className="library-empty-title">{t("library.traktNotConfiguredTitle")}</h2>
        <p className="library-empty-subtitle">
          {t("library.traktNotConfiguredSub")}
        </p>
        <Link className="btn-accent" to="/settings">
          {t("library.goToSettings")}
        </Link>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="library-empty-view">
        <AlertTriangle size="3rem" className="library-empty-icon error" />
        <h2 className="library-empty-title">{error}</h2>
        <FocusableButton focusKey="LIBRARY_ERROR_RETRY" className="overlay-btn" onClick={refetch}>{t("common.retry")}</FocusableButton>
      </div>
    );
  }

  const renderHeader = () => {
    if (isSearchPage) {
      return (
        <header className="library-header">
          <h1 className="library-large-title">{t("library.searchTitle")}</h1>
          <div className="search-input-wrapper">
            <SearchIcon size="1.125rem" className="search-input-icon" />
            <FocusableInput
              focusKey="SEARCH_INPUT"
              type="text"
              className="search-page-input"
              placeholder={t("library.searchPlaceholder")}
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (val.trim()) {
                  navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: true });
                } else {
                  navigate("/search", { replace: true });
                }
              }}
            />
            {query && (
              <FocusableButton
                className="search-input-clear-btn"
                onClick={() => {
                  setQuery("");
                  navigate("/search", { replace: true });
                }}
                title={t("library.clearSearch")}
              >
                <X size="1.125rem" />
              </FocusableButton>
            )}
          </div>
          {query.trim() && (
            <p className="library-metadata-count">{t("library.foundCount", { count: items.length })}</p>
          )}
        </header>
      );
    }

    if (category) {
      return (
        <header className="library-header">
          <h1 className="library-large-title">{category.title}</h1>
          <p className="library-metadata-count">{t("library.totalCount", { count: items.length })}</p>
        </header>
      );
    }

    return null;
  };

  const categoriesList = [
    { id: "up-next", label: t("library.tabs.upNext") },
    { id: "watchlist", label: t("library.tabs.watchlist") },
    { id: "favorites", label: t("library.tabs.favorites") },
    { id: "history", label: t("library.tabs.history") }
  ];

  const renderMobileCategories = () => {
    if (isSearchPage) return null;
    return (
      <div className="library-mobile-tabs-container">
        <div className="library-mobile-tabs-scroll">
          {categoriesList.map((cat) => {
            const isActive = collectionType === cat.id;
            return (
              <FocusableButton
                key={cat.id}
                onClick={() => navigate(`/library/${cat.id}`)}
                className={`library-mobile-tab-chip ${isActive ? "active" : ""}`}
              >
                {cat.label}
              </FocusableButton>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading && items.length === 0) {
      return (
        <LoadingSpinner 
          height="50vh" 
          message={isSearchPage ? t("library.searching") : t("library.loadingCollection")}
        />
      );
    }

    if (items.length > 0) {
      return (
        <>
          <Grid minWidth="10.625rem" className="library-grid">
            {items.slice(0, visibleCount).map((item, index) => (
              <MediaCardComponent
                key={item.id}
                item={item}
                // Stable per-card focusKey so focus restores to THIS card on Back.
                focusKey={index === 0 ? "LIBRARY_FIRST_CARD" : `LIBRARY_CARD_${item.id}`}
                onFocus={() => handleCardFocus(index)}
              />
            ))}
          </Grid>

          {visibleCount < items.length && (
            <div ref={renderSentinelRef} className="library-render-sentinel" aria-hidden="true" />
          )}

          {hasMore && (
            <div className="library-pagination-wrapper">
              {/* Always auto-load on scroll: desktop via this IntersectionObserver sentinel,
                  TV via focus-driven handleCardFocus. No manual "Load more" button. */}
              <div ref={sentinelRef} className="pagination-sentinel-loader">
                {loadingMore && <LoadingSpinner height="4rem" message={t("library.loadingMore")} size="small" />}
              </div>
            </div>
          )}
        </>
      );
    }

    if (isSearchPage) {
      if (query.trim()) {
        return (
          <div className="library-empty-view results-mode">
            <Film size="3rem" className="library-empty-icon muted" />
            <h2 className="library-empty-title">{t("library.nothingFound")}</h2>
            <p className="library-empty-subtitle">{t("library.searchNoResultsSub")}</p>
          </div>
        );
      }
      return (
        <div className="library-empty-view search-mode">
          <SearchIcon size="3rem" className="library-empty-icon muted" />
          <h2 className="library-empty-title">{t("library.startSearchTitle")}</h2>
          <p className="library-empty-subtitle">{t("library.startSearchSub")}</p>
        </div>
      );
    }

    if (category) {
      const EmptyIcon = category.icon;
      return (
        <div className="library-empty-view collection-mode">
          <EmptyIcon size="3rem" className="library-empty-icon muted" />
          <h2 className="library-empty-title">{category.emptyText}</h2>
          <p className="library-empty-subtitle">{category.emptySub}</p>
        </div>
      );
    }

    return null;
  };

  // TV: pin the header (title / search field); only the grid scrolls.
  if (isTV) {
    return (
      <PageFrame className="library-frame-tv" header={<div className="library-page-container library-frame-header">{renderHeader()}</div>}>
        <main className="library-content-area library-frame-body">{renderContent()}</main>
      </PageFrame>
    );
  }

  return (
    <div className="library-page-container">
      {renderHeader()}
      {renderMobileCategories()}
      <main className="library-content-area">
        {renderContent()}
      </main>
    </div>
  );
};

export default LibraryPage;

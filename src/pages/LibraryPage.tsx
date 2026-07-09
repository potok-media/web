import React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation, Link } from "react-router-dom";
import { Film, Search as SearchIcon, AlertTriangle } from "lucide-react";
import { useLibraryPage } from "../hooks/useLibraryPage";
import { useLibraryPageRendering } from "../hooks/useLibraryPageRendering";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "../components/MediaCardComponent";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LibraryPageHeader } from "../components/library/LibraryPageHeader";
import { CATEGORY_MAP, DYNAMIC_CATEGORY_TITLES } from "./LibraryConfig";
import { Grid } from "../components/common/Grid";
import { Button, cx } from "../components/ui";



export const LibraryPage: React.FC = () => {
  const { collectionType: routeType } = useParams<{ collectionType: string }>();
  const location = useLocation();
  const { t } = useTranslation("media");

  const isSearchPage = location.pathname === "/search";
  const collectionType = isSearchPage ? "search" : (routeType || "");

  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") || params.get("query") || "";

  const stateData = location.state as { items?: MediaCard[]; title?: string } | null;
  const hasStateData = !!stateData?.items;

  const isDynamicCategory = collectionType.includes(".");
  const dynamicTitleKey = DYNAMIC_CATEGORY_TITLES[collectionType];
  const rawCategory = CATEGORY_MAP[collectionType];
  const categoryTitle = hasStateData
    ? (stateData.title || t("library.category"))
    : (isDynamicCategory
      ? (dynamicTitleKey ? t(dynamicTitleKey) : t("library.category"))
      : (rawCategory ? t(rawCategory.title) : t("library.category")));

  const category = rawCategory
    ? { ...rawCategory, title: t(rawCategory.title), emptyText: t(rawCategory.emptyText), emptySub: t(rawCategory.emptySub) }
    : hasStateData
    ? { title: categoryTitle, endpoint: collectionType, icon: Film, emptyText: t("library.nothingFound"), emptySub: t("library.emptyCategorySub") }
    : isDynamicCategory
    ? { title: categoryTitle, endpoint: collectionType, icon: Film, emptyText: t("library.nothingFound"), emptySub: t("library.emptyCategorySub") }
    : null;

  const {
    items: hookItems,
    query,
    setQuery,
    loading: hookLoading,
    error: hookError,
    refetch,
    page,
    hasMore: hookHasMore,
    loadingMore: hookLoadingMore,
    loadNextPage,
  } = useLibraryPage({
    collectionType: hasStateData ? "" : (category?.endpoint || ""),
    isSearchPage,
    initialQuery,
  });

  const items = hasStateData ? stateData.items! : hookItems;
  const loading = hasStateData ? false : hookLoading;
  const error = hasStateData ? null : hookError;
  const hasMore = hasStateData ? false : hookHasMore;
  const loadingMore = hasStateData ? false : hookLoadingMore;

  const { visibleCount, renderSentinelRef, sentinelRef } = useLibraryPageRendering(
    items.length,
    collectionType,
    isSearchPage,
    query,
    hasMore,
    page,
    loading,
    loadingMore,
    loadNextPage,
  );

  if (error === "trakt_unauthorized") {
    return (
      <div className="library-empty-view">
        <AlertTriangle size="3rem" className="library-empty-icon warning" />
        <h2 className="library-empty-title">{t("library.traktNotConfiguredTitle")}</h2>
        <p className="library-empty-subtitle">{t("library.traktNotConfiguredSub")}</p>
        <Link className={cx("ui-btn", "ui-btn--accent")} to="/settings">{t("library.goToSettings")}</Link>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="library-empty-view">
        <AlertTriangle size="3rem" className="library-empty-icon error" />
        <h2 className="library-empty-title">{error}</h2>
        <Button variant="primary" className="overlay-btn" onClick={refetch}>{t("common.retry")}</Button>
      </div>
    );
  }

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
          <Grid className="library-grid">
            {items.slice(0, visibleCount).map((item) => (
              <MediaCardComponent
                key={item.id}
                item={item}
                showContinueOverlay={collectionType === "up-next"}
              />
            ))}
          </Grid>

          {visibleCount < items.length && (
            <div ref={renderSentinelRef} className="library-render-sentinel" aria-hidden="true" />
          )}

          {hasMore && (
            <div className="library-pagination-wrapper">
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

  return (
    <div className="library-page-container">
      <LibraryPageHeader
        isSearchPage={isSearchPage}
        category={category}
        query={query}
        setQuery={setQuery}
        itemsCount={items.length}
        collectionType={collectionType}
      />
      <main className="library-content-area">{renderContent()}</main>
    </div>
  );
};

export default LibraryPage;
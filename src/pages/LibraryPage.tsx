import React, { useRef, useEffect, useState } from "react";
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
import { FocusableInput, FocusableButton } from "../components/common/TVNavigation";
import "../styles/media.css";
 
export const LibraryPage: React.FC = () => {
  const { collectionType: routeType } = useParams<{ collectionType: string }>();
  const location = useLocation();
  const navigate = useNavigate();
 
  const isSearchPage = location.pathname === "/search";
  const collectionType = isSearchPage ? "search" : (routeType || "");
 
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get("q") || params.get("query") || "";
 
  const isDynamicCategory = collectionType.includes(".");
  const categoryTitle = isDynamicCategory 
    ? (DYNAMIC_CATEGORY_TITLES[collectionType] || "Категория")
    : (CATEGORY_MAP[collectionType]?.title || "Категория");
 
  const category = CATEGORY_MAP[collectionType] || (isDynamicCategory ? {
    title: categoryTitle,
    endpoint: collectionType,
    icon: Film,
    emptyText: "Ничего не найдено",
    emptySub: "В этой категории пока нет элементов"
  } : null);
 
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

  const [autoPageLimit, setAutoPageLimit] = useState(() => PlatformManager.isTV() ? 3 : 10);
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
    setAutoPageLimit(PlatformManager.isTV() ? 3 : 10);
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

  useEffect(() => {
    if (loading) return;
    if (isSearchPage) {
      setFocus("SEARCH_INPUT");
    } else if (items.length > 0) {
      setFocus("LIBRARY_FIRST_CARD");
    }
  }, [loading, isSearchPage, items.length]);

  useEffect(() => {
    if (!hasMore || page >= autoPageLimit || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadNextPage();
        }
      },
      {
        rootMargin: "300px",
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
  }, [hasMore, page, autoPageLimit, loading, loadingMore, loadNextPage]);

  if (error === "trakt_unauthorized") {
    return (
      <div className="library-empty-view">
        <AlertTriangle size={48} className="library-empty-icon warning" />
        <h2 className="library-empty-title">Синхронизация Trakt не настроена</h2>
        <p className="library-empty-subtitle">
          Чтобы просматривать разделы медиатеки, пожалуйста, привяжите вашу учетную запись Trakt в настройках Potok.
        </p>
        <Link className="btn-accent" to="/settings">
          Перейти к настройкам
        </Link>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="library-empty-view">
        <AlertTriangle size={48} className="library-empty-icon error" />
        <h2 className="library-empty-title">{error}</h2>
        <FocusableButton className="overlay-btn" onClick={refetch}>Повторить загрузку</FocusableButton>
      </div>
    );
  }

  const renderHeader = () => {
    if (isSearchPage) {
      return (
        <header className="library-header">
          <h1 className="library-large-title">Поиск</h1>
          <div className="search-input-wrapper">
            <SearchIcon size={18} className="search-input-icon" />
            <FocusableInput
              focusKey="SEARCH_INPUT"
              type="text"
              className="search-page-input"
              placeholder="Поиск фильмов и сериалов..."
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
                title="Очистить"
              >
                <X size={18} />
              </FocusableButton>
            )}
          </div>
          {query.trim() && (
            <p className="library-metadata-count">Найдено элементов: {items.length}</p>
          )}
        </header>
      );
    }

    if (category) {
      return (
        <header className="library-header">
          <h1 className="library-large-title">{category.title}</h1>
          <p className="library-metadata-count">Всего элементов: {items.length}</p>
        </header>
      );
    }

    return null;
  };

  const categoriesList = [
    { id: "up-next", label: "Продолжить" },
    { id: "watchlist", label: "Запланировано" },
    { id: "favorites", label: "Избранное" },
    { id: "history", label: "История" }
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
          message={isSearchPage ? "Ищем медиафайлы..." : "Загружаем коллекцию..."} 
        />
      );
    }

    if (items.length > 0) {
      return (
        <>
          <Grid minWidth="170px" className="library-grid">
            {items.slice(0, visibleCount).map((item, index) => (
              <MediaCardComponent
                key={item.id}
                item={item}
                focusKey={index === 0 ? "LIBRARY_FIRST_CARD" : undefined}
              />
            ))}
          </Grid>

          {visibleCount < items.length && (
            <div ref={renderSentinelRef} className="library-render-sentinel" aria-hidden="true" />
          )}

          {hasMore && visibleCount >= items.length && (
            <div className="library-pagination-wrapper">
              {page >= autoPageLimit ? (
                <FocusableButton
                  className="load-more-btn"
                  onClick={() => {
                    setAutoPageLimit((prev) => prev + (PlatformManager.isTV() ? 3 : 5));
                    loadNextPage();
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                </FocusableButton>
              ) : (
                <div ref={sentinelRef} className="pagination-sentinel-loader">
                  {loadingMore && <LoadingSpinner height="80px" message="Загружаем еще..." />}
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    if (isSearchPage) {
      if (query.trim()) {
        return (
          <div className="library-empty-view results-mode">
            <Film size={48} className="library-empty-icon muted" />
            <h2 className="library-empty-title">Ничего не найдено</h2>
            <p className="library-empty-subtitle">Попробуйте изменить запрос или проверить написание названия</p>
          </div>
        );
      }
      return (
        <div className="library-empty-view search-mode">
          <SearchIcon size={48} className="library-empty-icon muted" />
          <h2 className="library-empty-title">Начните поиск</h2>
          <p className="library-empty-subtitle">Введите название фильма или сериала для поиска по базе данных</p>
        </div>
      );
    }

    if (category) {
      const EmptyIcon = category.icon;
      return (
        <div className="library-empty-view collection-mode">
          <EmptyIcon size={48} className="library-empty-icon muted" />
          <h2 className="library-empty-title">{category.emptyText}</h2>
          <p className="library-empty-subtitle">{category.emptySub}</p>
        </div>
      );
    }

    return null;
  };

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

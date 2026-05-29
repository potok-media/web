import React, { useRef, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  Film, 
  Search as SearchIcon, 
  AlertTriangle
} from "lucide-react";
import { useLibraryPage } from "../hooks/useLibraryPage";
import { MediaCardComponent } from "../components/MediaCardComponent";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CATEGORY_MAP, DYNAMIC_CATEGORY_TITLES } from "./LibraryConfig";
import "../styles/media.css";

export const LibraryPage: React.FC = () => {
  const { collectionType: routeType } = useParams<{ collectionType: string }>();
  const navigate = useNavigate();
  const location = useLocation();

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

  const [autoPageLimit, setAutoPageLimit] = useState(10);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAutoPageLimit(10);
  }, [collectionType]);

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
        <button className="btn-accent" onClick={() => navigate("/settings")}>
          Перейти к настройкам
        </button>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="library-empty-view">
        <AlertTriangle size={48} className="library-empty-icon error" />
        <h2 className="library-empty-title">{error}</h2>
        <button className="overlay-btn" onClick={refetch}>Повторить загрузку</button>
      </div>
    );
  }

  const renderHeader = () => {
    if (isSearchPage) {
      return (
        <header className="library-header">
          <h1 className="library-large-title">Поиск</h1>
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
          <div className="library-grid">
            {items.map((item) => (
              <MediaCardComponent
                key={item.id}
                item={item}
                onClick={() => navigate(`/media/${item.mediaType}/${item.id}`)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="library-pagination-wrapper">
              {page >= autoPageLimit ? (
                <button 
                  className="load-more-btn"
                  onClick={() => {
                    setAutoPageLimit((prev) => prev + 5);
                    loadNextPage();
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                </button>
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
      <main className="library-content-area">
        {renderContent()}
      </main>
    </div>
  );
};

export default LibraryPage;

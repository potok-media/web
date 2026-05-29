import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { MediaCard } from "../network/ApiTypes";
import { useAppSettings } from "../context/AppSettingsContext";

// Profile-scoped SWR caches to completely prevent profile switching data leaks!
const profileCollectionsCache: Record<string, Record<string, MediaCard[]>> = {};
const profileSearchQueryCache: Record<string, string> = {};
const profileSearchResultsCache: Record<string, MediaCard[]> = {};
const profilePaginationCache: Record<string, Record<string, { page: number; hasMore: boolean }>> = {};

interface UseLibraryPageProps {
  collectionType: string;
  isSearchPage: boolean;
  initialQuery: string;
}

export function useLibraryPage({ collectionType, isSearchPage, initialQuery }: UseLibraryPageProps) {
  const { activeProfileID } = useAppSettings();
  const profileKey = activeProfileID || "default";

  // Safely initialize active profile collection cache
  const getCollectionCache = useCallback(() => {
    if (!profileCollectionsCache[profileKey]) {
      profileCollectionsCache[profileKey] = {};
    }
    return profileCollectionsCache[profileKey];
  }, [profileKey]);

  // Safely initialize active profile pagination cache
  const getPaginationCache = useCallback(() => {
    if (!profilePaginationCache[profileKey]) {
      profilePaginationCache[profileKey] = {};
    }
    return profilePaginationCache[profileKey];
  }, [profileKey]);

  const [items, setItems] = useState<MediaCard[]>(() => {
    if (isSearchPage) {
      return profileSearchResultsCache[profileKey] || [];
    }
    return getCollectionCache()[collectionType] || [];
  });

  const [query, setQuery] = useState(() => {
    if (isSearchPage) {
      return initialQuery || profileSearchQueryCache[profileKey] || "";
    }
    return "";
  });

  const [loading, setLoading] = useState(() => {
    if (isSearchPage) return false;
    return !getCollectionCache()[collectionType];
  });

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => {
    if (isSearchPage) return 1;
    return getPaginationCache()[collectionType]?.page || 1;
  });
  const [hasMore, setHasMore] = useState(() => {
    if (isSearchPage) return false;
    const cached = getPaginationCache()[collectionType];
    if (cached) return cached.hasMore;
    return !isSearchPage && collectionType.includes(".");
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchDebounceTimer = useRef<any>(null);

  const isItemsEqual = (a: MediaCard[], b: MediaCard[]): boolean => {
    if (a.length !== b.length) return false;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  const loadData = useCallback(
    async (showLoading = true, currentQuery = "", forceRefetch = false) => {
      if (!isSearchPage && !collectionType) {
        setError("Категория не найдена");
        return;
      }

      try {
        if (showLoading) setLoading(true);
        setError(null);

        let cards: MediaCard[] = [];

        if (isSearchPage) {
          setPage(1);
          if (!currentQuery.trim()) {
            cards = [];
          } else {
            cards = await ApiClient.searchMedia(currentQuery);
          }
          setItems(cards);
          profileSearchResultsCache[profileKey] = cards;
          profileSearchQueryCache[profileKey] = currentQuery;
          setHasMore(false);
        } else {
          let hasMoreFlag = false;
          if (collectionType.includes(".")) {
            cards = await ApiClient.fetchMediaRow(collectionType, 1);
            hasMoreFlag = cards.length >= 20;
            setHasMore(hasMoreFlag);
          } else {
            cards = await ApiClient.fetchLibraryCategory(collectionType);
            setHasMore(false);
          }
          
          setPage(1);
          getPaginationCache()[collectionType] = { page: 1, hasMore: hasMoreFlag };

          const activeCache = getCollectionCache()[collectionType] || [];
          if (forceRefetch || !getCollectionCache()[collectionType] || !isItemsEqual(activeCache, cards)) {
            setItems(cards);
            getCollectionCache()[collectionType] = cards;
          }
        }
      } catch (err: unknown) {
        const isAuthErr =
          (err instanceof ApiError && err.status === 401) ||
          (err instanceof Error && (err.message.includes("401") || err.message.toLowerCase().includes("unauthorized")));
        if (isAuthErr) {
          setError("trakt_unauthorized");
        } else {
          setError(err instanceof Error ? err.message : "Не удалось загрузить медиатеку");
        }
      } finally {
        setLoading(false);
      }
    },
    [profileKey, collectionType, isSearchPage, getCollectionCache, getPaginationCache]
  );

  const loadNextPage = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !collectionType.includes(".")) return;

    try {
      setLoadingMore(true);
      setError(null);
      const nextPage = page + 1;
      const cards = await ApiClient.fetchMediaRow(collectionType, nextPage);

      if (cards.length === 0) {
        setHasMore(false);
        getPaginationCache()[collectionType] = { page, hasMore: false };
      } else {
        setItems((prev) => {
          const combined = [...prev, ...cards];
          getCollectionCache()[collectionType] = combined;
          return combined;
        });
        setPage(nextPage);
        const hasMoreFlag = cards.length >= 20;
        setHasMore(hasMoreFlag);
        getPaginationCache()[collectionType] = { page: nextPage, hasMore: hasMoreFlag };
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить следующую страницу");
    } finally {
      setLoadingMore(false);
    }
  }, [collectionType, page, loading, loadingMore, hasMore, getCollectionCache, getPaginationCache]);

  // Synchronize component state with cache when active profile or route section changes
  useEffect(() => {
    if (isSearchPage) {
      setItems(profileSearchResultsCache[profileKey] || []);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setQuery(initialQuery || profileSearchQueryCache[profileKey] || "");
    } else {
      const cached = getCollectionCache()[collectionType];
      setItems(cached || []);
      setLoading(!cached);
      setError(null);

      // Restore pagination states from pagination cache
      const cachedPagination = getPaginationCache()[collectionType] || { page: 1, hasMore: collectionType.includes(".") };
      setPage(cachedPagination.page);
      setHasMore(cachedPagination.hasMore);

      // Only load data if we don't have it cached to prevent wasteful double-fetching and pagination resets
      if (!cached) {
        loadData(true, "", false);
      }
    }
  }, [profileKey, collectionType, isSearchPage, initialQuery, getCollectionCache, getPaginationCache, loadData]);

  // Debounced search query trigger
  useEffect(() => {
    if (!isSearchPage) return;

    profileSearchQueryCache[profileKey] = query;

    if (!query.trim()) {
      setItems([]);
      profileSearchResultsCache[profileKey] = [];
      setLoading(false);
      return;
    }

    setLoading(true);

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      loadData(false, query);
    }, 500);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [query, isSearchPage, loadData, profileKey]);

  return {
    items,
    query,
    setQuery,
    loading,
    error,
    refetch: () => loadData(true, query, true),
    page,
    hasMore,
    loadingMore,
    loadNextPage,
  };
}

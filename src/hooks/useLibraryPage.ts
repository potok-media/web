import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { MediaCard } from "../network/ApiTypes";
import { useSettings, useAuth } from "../context/AppSettingsContext";

// Search query and results caches are kept to preserve search state when navigating back from details
const profileSearchQueryCache: Record<string, string> = {};
const profileSearchResultsCache: Record<string, MediaCard[]> = {};

// Non-search category/row cache: preserves loaded (and paginated) items so navigating
// back from a details page restores the same list, letting scroll position be restored
// instead of resetting to page 1.
interface RowCacheEntry {
  items: MediaCard[];
  page: number;
  hasMore: boolean;
}
const rowCache: Record<string, RowCacheEntry> = {};
const rowCacheKey = (profileKey: string, collectionType: string) => `${profileKey}|${collectionType}`;

interface UseLibraryPageProps {
  collectionType: string;
  isSearchPage: boolean;
  initialQuery: string;
}

export function useLibraryPage({ collectionType, isSearchPage, initialQuery }: UseLibraryPageProps) {
  const { activeProfileID, language } = useSettings();
  const { syncStrategy } = useAuth();
  const { i18n } = useTranslation();
  // Language in the key isolates caches per language and re-runs fetches on language change.
  const profileKey = `${activeProfileID || "default"}_${syncStrategy}_${language}`;

  const [items, setItems] = useState<MediaCard[]>(() => {
    if (isSearchPage) {
      return profileSearchResultsCache[profileKey] || [];
    }
    return rowCache[rowCacheKey(profileKey, collectionType)]?.items || [];
  });

  const [query, setQuery] = useState(() => {
    if (isSearchPage) {
      return initialQuery || profileSearchQueryCache[profileKey] || "";
    }
    return "";
  });

  const [loading, setLoading] = useState(() => {
    // Skip the loading spinner when we can hydrate synchronously from the row cache.
    return isSearchPage ? true : !rowCache[rowCacheKey(profileKey, collectionType)];
  });

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => {
    if (isSearchPage) return 1;
    return rowCache[rowCacheKey(profileKey, collectionType)]?.page || 1;
  });
  const [hasMore, setHasMore] = useState(() => {
    if (isSearchPage) return false;
    const cached = rowCache[rowCacheKey(profileKey, collectionType)];
    return cached ? cached.hasMore : collectionType.includes(".");
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(
    async (showLoading = true, currentQuery = "") => {
      if (!isSearchPage && !collectionType) {
        setError(i18n.t("media:library.categoryNotFound"));
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
          startTransition(() => {
            setItems(cards);
          });
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
          rowCache[rowCacheKey(profileKey, collectionType)] = { items: cards, page: 1, hasMore: hasMoreFlag };
          startTransition(() => {
            setItems(cards);
          });
        }
      } catch (err: unknown) {
        const isAuthErr =
          (err instanceof ApiError && err.status === 401) ||
          (err instanceof Error && (err.message.includes("401") || err.message.toLowerCase().includes("unauthorized")));
        if (isAuthErr) {
          setError("trakt_unauthorized");
        } else {
          setError(err instanceof Error ? err.message : i18n.t("media:home.loadError"));
        }
      } finally {
        setLoading(false);
      }
    },
    [profileKey, collectionType, isSearchPage, i18n]
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
        const cached = rowCache[rowCacheKey(profileKey, collectionType)];
        if (cached) cached.hasMore = false;
      } else {
        const hasMoreFlag = cards.length >= 20;
        startTransition(() => {
          setItems(existing => {
            const uniqueNewCards = cards.filter(
              newCard => !existing.some(oldCard => oldCard.id === newCard.id)
            );
            const merged = [...existing, ...uniqueNewCards];
            rowCache[rowCacheKey(profileKey, collectionType)] = { items: merged, page: nextPage, hasMore: hasMoreFlag };
            return merged;
          });
        });
        setPage(nextPage);
        setHasMore(hasMoreFlag);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : i18n.t("media:library.nextPageError"));
    } finally {
      setLoadingMore(false);
    }
  }, [collectionType, page, loading, loadingMore, hasMore, i18n, profileKey]);

  // Synchronize component state when active profile or route section changes
  useEffect(() => {
    if (isSearchPage) {
      startTransition(() => {
        setItems(profileSearchResultsCache[profileKey] || []);
      });
      setLoading(false);
      setError(null);
      setHasMore(false);
      setQuery(initialQuery || profileSearchQueryCache[profileKey] || "");
    } else {
      const cached = rowCache[rowCacheKey(profileKey, collectionType)];
      if (cached) {
        // Restore the previously loaded (and paginated) list so scroll position can be
        // restored on back navigation, instead of resetting to page 1.
        startTransition(() => {
          setItems(cached.items);
        });
        setLoading(false);
        setError(null);
        setPage(cached.page);
        setHasMore(cached.hasMore);
      } else {
        startTransition(() => {
          setItems([]);
        });
        setLoading(true);
        setError(null);
        setPage(1);
        setHasMore(collectionType.includes("."));

        // No cache for this category yet — load data fresh
        loadData(true, "");
      }
    }
  }, [profileKey, collectionType, isSearchPage, initialQuery, loadData]);

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
    refetch: () => loadData(true, query),
    page,
    hasMore,
    loadingMore,
    loadNextPage,
  };
}

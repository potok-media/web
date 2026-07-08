import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { MediaCard } from "../network/ApiTypes";
import { useSettings, useAuth } from "../context/AppSettingsContext";

// Search query and results caches are kept to preserve search state when navigating back from details
const profileSearchQueryCache: Record<string, string> = {};
const profileSearchResultsCache: Record<string, MediaCard[]> = {};

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
    return [];
  });

  const [query, setQuery] = useState(() => {
    if (isSearchPage) {
      return initialQuery || profileSearchQueryCache[profileKey] || "";
    }
    return "";
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(() => {
    return !isSearchPage && collectionType.includes(".");
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchDebounceTimer = useRef<any>(null);

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
      } else {
        startTransition(() => {
          setItems(existing => {
            const uniqueNewCards = cards.filter(
              newCard => !existing.some(oldCard => oldCard.id === newCard.id)
            );
            return [...existing, ...uniqueNewCards];
          });
        });
        setPage(nextPage);
        const hasMoreFlag = cards.length >= 20;
        setHasMore(hasMoreFlag);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : i18n.t("media:library.nextPageError"));
    } finally {
      setLoadingMore(false);
    }
  }, [collectionType, page, loading, loadingMore, hasMore, i18n]);

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
      startTransition(() => {
        setItems([]);
      });
      setLoading(true);
      setError(null);
      setPage(1);
      setHasMore(collectionType.includes("."));

      // Always load data fresh
      loadData(true, "");
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

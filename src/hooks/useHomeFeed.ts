import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { HomeResponse } from "../network/ApiTypes";
import { useSettings, useAuth } from "../context/AppSettingsContext";
import { PlatformManager } from "../utils/PlatformManager";

// In-memory feed cache mapped by profile ID to prevent profile switching data leaks!
const profileFeedCache: Record<string, HomeResponse> = {};

const getCachedFeed = (profileKey: string): HomeResponse | null => {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`potok_cached_feed_${profileKey}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to parse cached feed from localStorage", e);
    return null;
  }
};

const setCachedFeed = (profileKey: string, feed: HomeResponse): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`potok_cached_feed_${profileKey}`, JSON.stringify(feed));
  } catch (e) {
    console.error("Failed to save feed to localStorage cache", e);
  }
};

export function useHomeFeed(onError: (msg: string) => void) {
  const { activeProfileID } = useSettings();
  const { logout } = useAuth();
  const profileKey = activeProfileID || "default";

  const [feed, setFeed] = useState<HomeResponse | null>(() => {
    return profileFeedCache[profileKey] || getCachedFeed(profileKey) || null;
  });
  
  const [loading, setLoading] = useState(() => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    return !cached;
  });
  
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(() => {
    return (profileFeedCache[profileKey] || getCachedFeed(profileKey))?.nextCursor;
  });

  const onErrorRef = useRef(onError);
  const isLoadingMoreRef = useRef(false);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setNextCursor(feed?.nextCursor);
  }, [feed]);

  const fetchFeed = useCallback(async (showLoading = false) => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    const shouldShowLoading = showLoading || !cached;
    
    try {
      if (shouldShowLoading) setLoading(true);
      
      const posterSize = PlatformManager.isTV() ? "w185" : "w342";
      const data = await ApiClient.fetchHomeFeed(null, posterSize, "w1280");

      const isFeedEqual = (a: HomeResponse | null, b: HomeResponse | null): boolean => {
        if (a === b) return true;
        if (!a || !b) return false;
        try {
          return JSON.stringify(a) === JSON.stringify(b);
        } catch {
          return false;
        }
      };

      if (!cached || !isFeedEqual(cached, data)) {
        profileFeedCache[profileKey] = data;
        setCachedFeed(profileKey, data);
        setFeed(data);
      }
    } catch (err: unknown) {
      const isAuthErr =
          (err instanceof ApiError && err.status === 401) ||
          (err instanceof Error && (err.message.includes("401") || err.message.toLowerCase().includes("unauthorized")));
      if (isAuthErr) {
        logout();
      } else {
        onErrorRef.current(err instanceof Error ? err.message : "Не удалось загрузить медиатеку");
      }
    } finally {
      if (shouldShowLoading) setLoading(false);
    }
  }, [profileKey, logout]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || isLoadingMoreRef.current) return;
    try {
      isLoadingMoreRef.current = true;
      setLoadingMore(true);
      const posterSize = PlatformManager.isTV() ? "w185" : "w342";
      const nextData = await ApiClient.fetchHomeFeed(nextCursor, posterSize, "w1280");
      
      setFeed((prev) => {
        if (!prev) return nextData;
        
        // Prevent duplicate rows from being added
        const existingIds = new Set(prev.rows.map((r) => r.id));
        const newRows = nextData.rows.filter((r) => !existingIds.has(r.id));
        
        const updatedFeed = {
          ...prev,
          rows: [...prev.rows, ...newRows],
          nextCursor: nextData.nextCursor,
        };
        profileFeedCache[profileKey] = updatedFeed;
        setCachedFeed(profileKey, updatedFeed);
        return updatedFeed;
      });
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : "Не удалось дозагрузить ряды");
    } finally {
      isLoadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, profileKey]);

  useEffect(() => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    setFeed(cached);
    setLoading(!cached);
    fetchFeed();
  }, [profileKey, fetchFeed]);

  return {
    feed,
    loading,
    refetch: () => fetchFeed(true),
    loadMore,
    hasMore: !!nextCursor,
    loadingMore,
  };
}

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { HomeResponse } from "../network/ApiTypes";
import { useSettings, useAuth } from "../context/AppSettingsContext";
import { PlatformManager } from "../utils/PlatformManager";
import { backdropSizeForQuality } from "../utils/mediaUtils";
import { logger } from "../utils/logger";

// In-memory feed cache mapped by profile ID to prevent profile switching data leaks!
const profileFeedCache: Record<string, HomeResponse> = {};

const getCachedFeed = (profileKey: string): HomeResponse | null => {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(`potok_cached_feed_${profileKey}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    logger.error("Failed to parse cached feed from localStorage", e);
    return null;
  }
};

const setCachedFeed = (profileKey: string, feed: HomeResponse): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`potok_cached_feed_${profileKey}`, JSON.stringify(feed));
  } catch (e) {
    logger.error("Failed to save feed to localStorage cache", e);
  }
};

export function useHomeFeed(onError: (msg: string) => void) {
  const { activeProfileID, bannerQuality, language } = useSettings();
  const { logout } = useAuth();
  const { i18n } = useTranslation();
  // Language is part of the cache key so each language has its own feed, and changing it
  // re-runs the fetch effect (refetches in the new language).
  const profileKey = `${activeProfileID || "default"}_${language}`;

  const [feed, setFeed] = useState<HomeResponse | null>(() => {
    return profileFeedCache[profileKey] || getCachedFeed(profileKey) || null;
  });
  
  const [loading, setLoading] = useState(() => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    return !cached;
  });

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchFeed = useCallback(async (showLoading = false) => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    const shouldShowLoading = showLoading || !cached;
    
    try {
      if (shouldShowLoading) setLoading(true);
      
      const posterSize = PlatformManager.isTV() ? "w185" : "w342";
      const backdropSize = backdropSizeForQuality(bannerQuality, PlatformManager.isTV());
      const data = await ApiClient.fetchHomeFeed(posterSize, backdropSize);

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
        startTransition(() => {
          setFeed(data);
        });
      }
    } catch (err: unknown) {
      const isAuthErr =
          (err instanceof ApiError && err.status === 401) ||
          (err instanceof Error && (err.message.includes("401") || err.message.toLowerCase().includes("unauthorized")));
      if (isAuthErr) {
        logout();
      } else {
        onErrorRef.current(err instanceof Error ? err.message : i18n.t("media:home.loadError"));
      }
    } finally {
      if (shouldShowLoading) setLoading(false);
    }
  }, [profileKey, logout, bannerQuality, i18n]);

  useEffect(() => {
    const cached = profileFeedCache[profileKey] || getCachedFeed(profileKey);
    startTransition(() => {
      setFeed(cached);
    });
    setLoading(!cached);
    fetchFeed();
  }, [profileKey, fetchFeed]);

  return {
    feed,
    loading,
    refetch: () => fetchFeed(true),
  };
}

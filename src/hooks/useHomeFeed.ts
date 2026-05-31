import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { HomeResponse } from "../network/ApiTypes";
import { useSettings, useAuth } from "../context/AppSettingsContext";

// In-memory feed cache mapped by profile ID to prevent profile switching data leaks!
const profileFeedCache: Record<string, HomeResponse> = {};

export function useHomeFeed(onError: (msg: string) => void) {
  const { activeProfileID } = useSettings();
  const { logout } = useAuth();
  const profileKey = activeProfileID || "default";

  const [feed, setFeed] = useState<HomeResponse | null>(() => {
    return profileFeedCache[profileKey] || null;
  });
  const [loading, setLoading] = useState(() => !profileFeedCache[profileKey]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const fetchFeed = useCallback(async (showLoading = !profileFeedCache[profileKey]) => {
    try {
      if (showLoading) setLoading(true);
      const data = await ApiClient.fetchHomeFeed();

      const isFeedEqual = (a: HomeResponse | null, b: HomeResponse | null): boolean => {
        if (a === b) return true;
        if (!a || !b) return false;
        try {
          return JSON.stringify(a) === JSON.stringify(b);
        } catch {
          return false;
        }
      };

      const cached = profileFeedCache[profileKey] || null;
      if (!cached || !isFeedEqual(cached, data)) {
        profileFeedCache[profileKey] = data;
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
      if (showLoading) setLoading(false);
    }
  }, [profileKey, logout]);

  useEffect(() => {
    setFeed(profileFeedCache[profileKey] || null);
    setLoading(!profileFeedCache[profileKey]);
    fetchFeed();
  }, [profileKey, fetchFeed]);

  return {
    feed,
    loading,
    refetch: () => fetchFeed(true),
  };
}

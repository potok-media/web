import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { MediaCard } from "../network/ApiTypes";
import { useAuth } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";

export interface CalendarGroup {
  title: string;
  items: MediaCard[];
}

export function useCalendarData() {
  const [items, setItems] = useState<MediaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const { syncStrategy, traktToken } = useAuth();
  const { i18n } = useTranslation();

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Endpoint retrieves personal calendar if Trakt token is set, otherwise global
      const data = await ApiClient.fetchLibraryCategory("calendar");
      if (isMountedRef.current) {
        // Sort chronologically by air time (if available)
        const sorted = [...data].sort((a, b) => {
          if (!a.airDateTime) return 1;
          if (!b.airDateTime) return -1;
          return new Date(a.airDateTime).getTime() - new Date(b.airDateTime).getTime();
        });
        setItems(sorted);
      }
    } catch (err) {
      if (isMountedRef.current) {
        logger.error("[useCalendarData] Failed to fetch calendar:", err);
        if (err instanceof ApiError) {
          setError(err.message || i18n.t("media:calendar.loadError"));
        } else {
          setError(i18n.t("media:calendar.connectionError"));
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [syncStrategy, traktToken, i18n, i18n.language]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchCalendar();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCalendar]);

  return {
    items,
    loading,
    error,
    refetch: fetchCalendar,
    isTraktConnected: !!traktToken
  };
}

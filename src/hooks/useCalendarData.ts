import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { ApiError } from "../network/ApiTypes";
import type { MediaCard } from "../network/ApiTypes";
import { useAuth } from "../context/AppSettingsContext";

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
        console.error("[useCalendarData] Failed to fetch calendar:", err);
        if (err instanceof ApiError) {
          setError(err.message || "Не удалось загрузить расписание релизов");
        } else {
          setError("Не удалось установить соединение с сервером");
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [syncStrategy, traktToken]);

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

import { useState, useEffect } from "react";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import { MemorySafeCache } from "../network/MemorySafeCache";

// Create cache instance: 5 minutes TTL (300,000 ms), max 100 elements
const seasonCache = new MemorySafeCache(300000, 100);

interface ActiveRequest {
  promise: Promise<any>;
  controller: AbortController;
  refCount: number;
}

// In-flight request map to prevent parallel duplicate calls
const activeRequests = new Map<string, ActiveRequest>();

export function useSeasonEpisodes(mediaId: number, seasonNumber: number) {
  const cacheKey = `${mediaId}_s${seasonNumber}`;
  
  // Instantly resolve cache during render to eliminate flickers/skeletons
  const cachedData = mediaId && seasonNumber > 0 ? seasonCache.get<TvEpisode[]>(cacheKey) : null;

  const [episodes, setEpisodes] = useState<TvEpisode[]>(() => cachedData || []);
  const [loading, setLoading] = useState(() => !cachedData && mediaId > 0 && seasonNumber > 0);
  const [error, setError] = useState<string | null>(null);

  const [prevKey, setPrevKey] = useState(cacheKey);

  // Synchronously sync state if key changes
  if (cacheKey !== prevKey) {
    setPrevKey(cacheKey);
    const cached = seasonCache.get<TvEpisode[]>(cacheKey);
    setEpisodes(cached || []);
    setLoading(!cached);
    setError(null);
  }

  useEffect(() => {
    if (!mediaId || seasonNumber <= 0) return;

    // Check if data is already cached
    const cached = seasonCache.get<TvEpisode[]>(cacheKey);
    if (cached) {
      setEpisodes(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let active = activeRequests.get(cacheKey);
    if (active) {
      active.refCount++;
    } else {
      const controller = new AbortController();
      const promise = ApiClient.fetchTvSeason(mediaId, seasonNumber, { signal: controller.signal });
      active = {
        promise,
        controller,
        refCount: 1,
      };
      activeRequests.set(cacheKey, active);
    }

    const loadEpisodes = async () => {
      // Ensure loading state is set (in case it wasn't during sync render)
      setLoading(true);
      setError(null);

      try {
        const data = await active.promise;
        const mapped: TvEpisode[] = (data.episodes || []).map((ep: any) => ({
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          name: ep.name,
          overview: ep.overview,
          stillPath: ep.stillPath || ep.still_path,
          airDate: ep.airDate,
          seasonNumber: seasonNumber,
        }));

        // Cache it for 5 minutes
        seasonCache.set(cacheKey, mapped);

        setEpisodes(mapped);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Не удалось загрузить эпизоды сезона");
        }
      } finally {
        if (activeRequests.get(cacheKey) === active) {
          activeRequests.delete(cacheKey);
        }
        setLoading(false);
      }
    };

    loadEpisodes();

    return () => {
      if (active) {
        active.refCount--;
        if (active.refCount <= 0) {
          active.controller.abort();
          if (activeRequests.get(cacheKey) === active) {
            activeRequests.delete(cacheKey);
          }
        }
      }
    };
  }, [mediaId, seasonNumber]);

  return { episodes, loading, error };
}


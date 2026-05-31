import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { SyncApiClient } from "../network/SyncApiClient";
import { Storage } from "../utils/StorageService";
import type { MediaCard } from "../network/ApiTypes";

interface UseMediaDetailsProps {
  mediaType?: string;
  mediaId?: number;
  playParam?: string | null;
  onNavigateToStreams: (season?: number, episode?: number) => void;
  showHUD: (type: "success" | "error" | "info" | "warning", msg: string) => void;
}

export function useMediaDetails({
  mediaType,
  mediaId,
  playParam,
  onNavigateToStreams,
  showHUD,
}: UseMediaDetailsProps) {
  const [media, setMedia] = useState<MediaCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  const onNavigateToStreamsRef = useRef(onNavigateToStreams);
  const showHUDRef = useRef(showHUD);

  useEffect(() => {
    onNavigateToStreamsRef.current = onNavigateToStreams;
    showHUDRef.current = showHUD;
  }, [onNavigateToStreams, showHUD]);

  const checkIsWatched = useCallback((item: MediaCard) => {
    if (!item.progress) return false;
    return item.mediaType === "movie"
      ? item.progress.completed > 0
      : item.progress.completed >= item.progress.aired;
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!mediaType || !mediaId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await ApiClient.fetchMediaDetails(mediaType, mediaId);
      setMedia(data);

      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        const [favs, watch, hist] = await Promise.all([
          SyncApiClient.fetchSyncFavorites(),
          SyncApiClient.fetchSyncWatchlist(),
          SyncApiClient.fetchSyncHistory()
        ]);
        const favActive = favs.some((f) => f.tmdbId === mediaId.toString() && f.mediaType === mediaType);
        const watchActive = watch.some((w) => w.tmdbId === mediaId.toString() && w.mediaType === mediaType);
        const watchedActive = hist.some((h) => h.tmdbId === mediaId.toString() && (h.mediaType === mediaType || (mediaType === "tv" && h.mediaType === "episode")));
        
        setInWatchlist(watchActive);
        setIsFavorite(favActive);
        setIsWatched(watchedActive);
      } else {
        setInWatchlist(data.isInWatchlist || false);
        setIsFavorite(data.isFavorite || false);
        setIsWatched(checkIsWatched(data));
      }

      if (playParam === "true") {
        if (data.mediaType === "tv") {
          const s = data.progress?.nextSeason || 1;
          const e = data.progress?.nextEpisode || 1;
          onNavigateToStreamsRef.current(s, e);
        } else {
          onNavigateToStreamsRef.current();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить сведения");
    } finally {
      setLoading(false);
    }
  }, [mediaType, mediaId, playParam, checkIsWatched]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const toggleWatchlist = async () => {
    if (!media) return;
    try {
      const nextState = !inWatchlist;
      setInWatchlist(nextState);
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await SyncApiClient.addSyncWatchlist(media.id.toString(), media.mediaType);
        } else {
          await SyncApiClient.removeSyncWatchlist(media.id.toString(), media.mediaType);
        }
      } else {
        const payload = {
          movies: media.mediaType === "movie" ? [{ ids: { tmdb: media.id } }] : [],
          shows: media.mediaType === "tv" ? [{ ids: { tmdb: media.id } }] : []
        };
        await ApiClient.syncTraktAction(nextState ? "watchlist" : "watchlist/remove", payload);
      }
      showHUDRef.current("success", nextState ? "Добавлено в список ожидания" : "Удалено из списка ожидания");
      fetchDetails();
    } catch {
      setInWatchlist(media.isInWatchlist || false);
      showHUDRef.current("error", "Ошибка при обновлении списка ожидания");
    }
  };

  const toggleFavorite = async () => {
    if (!media) return;
    try {
      const nextState = !isFavorite;
      setIsFavorite(nextState);
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await SyncApiClient.addSyncFavorite(media.id.toString(), media.mediaType);
        } else {
          await SyncApiClient.removeSyncFavorite(media.id.toString(), media.mediaType);
        }
      } else {
        const payload = {
          movies: media.mediaType === "movie" ? [{ ids: { tmdb: media.id } }] : [],
          shows: media.mediaType === "tv" ? [{ ids: { tmdb: media.id } }] : []
        };
        await ApiClient.syncTraktAction(nextState ? "favorites" : "favorites/remove", payload);
      }
      showHUDRef.current("success", nextState ? "Добавлено в избранное" : "Удалено из избранного");
      fetchDetails();
    } catch {
      setIsFavorite(media.isFavorite || false);
      showHUDRef.current("error", "Ошибка при обновлении избранного");
    }
  };

  const toggleWatched = async () => {
    if (!media) return;
    try {
      const nextState = !isWatched;
      setIsWatched(nextState);
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await SyncApiClient.saveSyncProgress(media.id.toString(), media.mediaType, undefined, undefined, 100, 100);
        } else {
          await SyncApiClient.removeSyncProgress(media.id.toString(), media.mediaType, undefined, undefined);
        }
      } else {
        const payload = {
          movies: media.mediaType === "movie" ? [{ ids: { tmdb: media.id } }] : [],
          shows: media.mediaType === "tv" ? [{ ids: { tmdb: media.id } }] : []
        };
        await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
      }
      showHUDRef.current("success", nextState ? "Отмечено просмотренным" : "Удалено из истории");
      fetchDetails();
    } catch {
      setIsWatched(checkIsWatched(media));
      showHUDRef.current("error", "Ошибка при обновлении истории");
    }
  };

  return {
    media,
    loading,
    error,
    inWatchlist,
    isFavorite,
    isWatched,
    toggleWatchlist,
    toggleFavorite,
    toggleWatched,
    refetch: fetchDetails,
  };
}

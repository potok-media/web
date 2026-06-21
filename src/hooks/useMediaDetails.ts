import { useState, useEffect, useCallback, useRef } from "react";
import { ApiClient } from "../network/ApiClient";
import { SyncApiClient } from "../network/SyncApiClient";
import { Storage } from "../utils/StorageService";
import { useWSSync } from "../context/WSSyncContext";
import { PlatformManager } from "../utils/PlatformManager";
import { resizeTmdbImage, backdropSizeForQuality } from "../utils/mediaUtils";
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

  const lastFetchTimeRef = useRef<number>(0);
  // Mirror of `media` for synchronous reads inside the WebSocket handler, so we can
  // compute the next state once and call setMedia/setIsWatched with concrete values
  // (no setState nested inside a setMedia updater).
  const mediaRef = useRef<MediaCard | null>(null);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);
  const { subscribeToMedia } = useWSSync();

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

  const fetchDetails = useCallback(async (silent: boolean | any = false) => {
    if (!mediaType || !mediaId) return;
    try {
      if (silent !== true) {
        setLoading(true);
        // Tolerate small client-server time drift
        lastFetchTimeRef.current = Date.now() - 5000;
      }
      setError(null);
      if (silent === true) {
        ApiClient.invalidateCache();
      }
      const data = await ApiClient.fetchMediaDetails(mediaType, mediaId);

      // Size the full-screen hero backdrop by the user's banner-quality setting (default "auto"
      // keeps the perf-friendly w780 on TV / w1280 on desktop).
      if (data.backdropSrc) {
        const bannerQuality = Storage.get<string>("bannerQuality", "auto");
        data.backdropSrc = resizeTmdbImage(
          data.backdropSrc,
          backdropSizeForQuality(bannerQuality, PlatformManager.isTV())
        );
      }

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
        
        const watchedEpisodes = hist
          .filter((h) => h.tmdbId === mediaId.toString() && h.seasonNumber !== undefined && h.episodeNumber !== undefined)
          .map((h) => ({ season: h.seasonNumber!, number: h.episodeNumber! }));

        data.progress = {
          ...data.progress,
          watchedEpisodes,
          completed: mediaType === "movie" ? (watchedActive ? 100 : 0) : watchedEpisodes.length,
          percentage: data.progress?.percentage || 0
        } as any;

        data.isFavorite = favActive;
        data.isInWatchlist = watchActive;

        setMedia(data);
        setInWatchlist(watchActive);
        setIsFavorite(favActive);
        setIsWatched(watchedActive);
      } else {
        setMedia(data);
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
    fetchDetails(false);
  }, [fetchDetails]);

  // Subscribe to real-time events and update UI state reactively (Pitfall 19: Bootstrap Race Condition)
  useEffect(() => {
    if (!mediaId || !mediaType) return;

    const unsubscribe = subscribeToMedia(mediaId, mediaType, (event, payload, timestamp) => {
      const eventTime = new Date(timestamp).getTime();
      if (eventTime < lastFetchTimeRef.current) {
        // Ignore events that are older than our last HTTP fetch start time
        return;
      }

      // Invalidate the cache to ensure future loads fetch fresh data
      ApiClient.invalidateCache();

      if (event === "sync:history:changed") {
        const { seasonNumber, episodeNumber, isWatched: watchState } = payload;
        const prev = mediaRef.current;
        if (!prev) return;
        let watchedEpisodes = [...(prev.progress?.watchedEpisodes || [])];
        if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
          if (watchState) {
            if (!watchedEpisodes.some(ep => ep.season === seasonNumber && ep.number === episodeNumber)) {
              watchedEpisodes.push({ season: seasonNumber, number: episodeNumber });
            }
          } else {
            watchedEpisodes = watchedEpisodes.filter(ep => !(ep.season === seasonNumber && ep.number === episodeNumber));
          }
        }
        const updatedMedia = {
          ...prev,
          progress: {
            ...prev.progress,
            watchedEpisodes,
            completed: mediaType === "movie"
              ? (watchState ? 100 : 0)
              : watchedEpisodes.length
          } as any
        };
        mediaRef.current = updatedMedia;
        setMedia(updatedMedia);
        setIsWatched(mediaType === "movie" ? watchState : checkIsWatched(updatedMedia));
      }
      else if (event === "sync:history:batch_changed") {
        const { changes } = payload;
        const prev = mediaRef.current;
        if (!prev) return;
        let watchedEpisodes = [...(prev.progress?.watchedEpisodes || [])];
        for (const ch of changes) {
          const { seasonNumber, episodeNumber, isWatched: watchState } = ch;
          if (watchState) {
            if (!watchedEpisodes.some(ep => ep.season === seasonNumber && ep.number === episodeNumber)) {
              watchedEpisodes.push({ season: seasonNumber, number: episodeNumber });
            }
          } else {
            watchedEpisodes = watchedEpisodes.filter(ep => !(ep.season === seasonNumber && ep.number === episodeNumber));
          }
        }
        const updatedMedia = {
          ...prev,
          progress: {
            ...prev.progress,
            watchedEpisodes,
            completed: watchedEpisodes.length
          } as any
        };
        mediaRef.current = updatedMedia;
        setMedia(updatedMedia);
        setIsWatched(checkIsWatched(updatedMedia));
      }
      else if (event === "sync:library:updated") {
        const { listType, action } = payload;
        if (listType === "watchlist") {
          setInWatchlist(action === "add");
        } else if (listType === "favorites") {
          setIsFavorite(action === "add");
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [mediaId, mediaType, subscribeToMedia, checkIsWatched]);

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
      fetchDetails(true);
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
      fetchDetails(true);
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
      fetchDetails(true);
    } catch {
      setIsWatched(checkIsWatched(media));
      showHUDRef.current("error", "Ошибка при обновлении истории");
    }
  };

  const toggleEpisodeWatched = async (seasonNumber: number, episodeNumber: number, nextState: boolean) => {
    if (!media) return;
    try {
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await SyncApiClient.saveSyncProgress(media.id.toString(), "tv", seasonNumber, episodeNumber, 100, 100);
        } else {
          await SyncApiClient.removeSyncProgress(media.id.toString(), "tv", seasonNumber, episodeNumber);
        }
      } else {
        const payload = {
          movies: [],
          shows: [{
            ids: { tmdb: media.id },
            seasons: [{
              number: seasonNumber,
              episodes: [{ number: episodeNumber }]
            }]
          }],
          episodes: []
        };
        await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
      }
      showHUDRef.current("success", nextState ? `Эпизод ${episodeNumber} отмечен просмотренным` : `Эпизод ${episodeNumber} удален из истории`);
      fetchDetails(true);
    } catch {
      showHUDRef.current("error", "Ошибка при обновлении истории эпизода");
    }
  };

  const toggleSeasonWatched = async (seasonNumber: number, episodesList: { episodeNumber: number }[], nextState: boolean) => {
    if (!media) return;
    try {
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await Promise.all(
            episodesList.map(ep =>
              SyncApiClient.saveSyncProgress(media.id.toString(), "tv", seasonNumber, ep.episodeNumber, 100, 100)
            )
          );
        } else {
          await Promise.all(
            episodesList.map(ep =>
              SyncApiClient.removeSyncProgress(media.id.toString(), "tv", seasonNumber, ep.episodeNumber)
            )
          );
        }
      } else {
        const payload = {
          movies: [],
          shows: [{
            ids: { tmdb: media.id },
            seasons: [{
              number: seasonNumber,
              episodes: episodesList.map(ep => ({ number: ep.episodeNumber }))
            }]
          }],
          episodes: []
        };
        await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
      }
      showHUDRef.current("success", nextState ? `Сезон ${seasonNumber} отмечен просмотренным` : `Сезон ${seasonNumber} удален из истории`);
      fetchDetails(true);
    } catch {
      showHUDRef.current("error", "Ошибка при обновлении истории сезона");
    }
  };

  const saveEpisodeSelection = async (newSelection: { season: number; number: number }[]) => {
    if (!media) return;
    try {
      const initial = media.progress?.watchedEpisodes || [];
      
      const toAdd = newSelection.filter(ns => !initial.some(init => init.season === ns.season && init.number === ns.number));
      const toRemove = initial.filter(init => !newSelection.some(ns => ns.season === init.season && ns.number === init.number));
      
      if (toAdd.length === 0 && toRemove.length === 0) return;

      const changes = [
        ...toAdd.map(item => ({ seasonNumber: item.season, episodeNumber: item.number, isWatched: true })),
        ...toRemove.map(item => ({ seasonNumber: item.season, episodeNumber: item.number, isWatched: false }))
      ];

      await SyncApiClient.saveSyncBulkProgress(media.id.toString(), "tv", changes);
      
      showHUDRef.current("success", "История просмотра обновлена");
      fetchDetails(true);
    } catch {
      showHUDRef.current("error", "Ошибка при сохранении истории просмотра");
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
    toggleEpisodeWatched,
    toggleSeasonWatched,
    saveEpisodeSelection,
    refetch: fetchDetails,
  };
}

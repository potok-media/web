import { useEffect, useRef, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { SyncApiClient } from "../network/SyncApiClient";
import { logger } from "../utils/logger";

export interface PlaybackProgress {
  progressSeconds: number;
  durationSeconds: number;
  lastWatchedAt: string;
  isCompleted: boolean;
}

interface UsePlaybackTrackerParams {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playback: {
    id: number;
    mediaType: string;
    season?: number;
    episode?: number;
  };
  seekOffset: number;
  isActive: boolean;
  duration: number;
}

export function usePlaybackTracker({
  videoRef,
  playback,
  seekOffset,
  isActive,
  duration,
}: UsePlaybackTrackerParams) {
  const lastSavedTimeRef = useRef<number>(0);
  const syncIntervalRef = useRef<any>(null);
  const { id, mediaType, season, episode } = playback;

  // Reset last saved time when media ID / episode changes
  useEffect(() => {
    lastSavedTimeRef.current = 0;
  }, [id, season, episode]);

  const getStorageKeys = useCallback(() => {
    const s = season ?? 0;
    const e = episode ?? 0;
    const progressKey = `potok_progress:${id}:${s}:${e}`;
    const resumeKey = `potok_playback_resume:${id}:${s}:${e}`;
    return { progressKey, resumeKey };
  }, [id, season, episode]);

  const saveProgress = useCallback((
    currentTime: number,
    durationVal: number,
    forceRemote: boolean = false
  ) => {
    if (durationVal <= 0) return;

    const actualTime = seekOffset > 0 ? (seekOffset + currentTime) : currentTime;
    
    // Порог начала (менее 15 секунд или 2% от длительности не сохраняем)
    if (actualTime < 15 || actualTime / durationVal < 0.02) {
      return;
    }

    const isCompleted = actualTime / durationVal > 0.90;
    const { progressKey, resumeKey } = getStorageKeys();

    // 1. Локальное сохранение (Local-first)
    const progressData: PlaybackProgress = {
      progressSeconds: Math.floor(actualTime),
      durationSeconds: Math.floor(durationVal),
      lastWatchedAt: new Date().toISOString(),
      isCompleted,
    };
    Storage.set(progressKey, progressData);

    // Сохраняем таймкод для возобновления в плеере
    if (!isCompleted) {
      localStorage.setItem(resumeKey, Math.floor(actualTime).toString());
    } else {
      localStorage.removeItem(resumeKey);
    }

    // 2. Внешняя синхронизация (Throttled или Forced)
    const timeSinceLastSync = Math.abs(actualTime - lastSavedTimeRef.current);
    if (forceRemote || timeSinceLastSync >= 10 || isCompleted) {
      lastSavedTimeRef.current = actualTime;
      
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server" || strategy === "trakt") {
        SyncApiClient.saveSyncProgress(
          id.toString(),
          mediaType,
          season,
          episode,
          Math.floor(actualTime),
          Math.floor(durationVal)
        ).catch((err) => logger.error("[Sync] Failed to save progress:", err));
      }
    }
  }, [id, mediaType, season, episode, seekOffset, getStorageKeys]);

  const handleManualSave = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      saveProgress(video.currentTime, duration, true);
    }
  }, [videoRef, saveProgress, duration]);

  // Запуск интервала отслеживания во время активного воспроизведения
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Интервал раз в 5 секунд для проверки изменения времени
    syncIntervalRef.current = setInterval(() => {
      if (video && !video.paused) {
        saveProgress(video.currentTime, duration, false);
      }
    }, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [videoRef, isActive, saveProgress, duration]);

  // Слушатели событий жизненного цикла видео и вкладки браузера
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePause = () => {
      saveProgress(video.currentTime, duration, true);
    };

    const handleEnded = () => {
      const { resumeKey } = getStorageKeys();
      localStorage.removeItem(resumeKey);
      
      // Помечаем локально как завершенное
      const { progressKey } = getStorageKeys();
      const progressData: PlaybackProgress = {
        progressSeconds: Math.floor(duration),
        durationSeconds: Math.floor(duration),
        lastWatchedAt: new Date().toISOString(),
        isCompleted: true,
      };
      Storage.set(progressKey, progressData);

      // Удаляем с бэкенда/Trakt прогресс (переходит в статус полностью просмотрено)
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server" || strategy === "trakt") {
        SyncApiClient.saveSyncProgress(
          id.toString(),
          mediaType,
          season,
          episode,
          Math.floor(duration),
          Math.floor(duration)
        ).catch((err) => logger.error("[Sync] Failed to mark completed on ended:", err));
      }
    };

    const handleBeforeUnload = () => {
      saveProgress(video.currentTime, duration, true);
    };

    const handleSeeked = () => {
      saveProgress(video.currentTime, duration, true);
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("seeked", handleSeeked);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("seeked", handleSeeked);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [videoRef, saveProgress, getStorageKeys, id, mediaType, season, episode, duration]);

  return {
    saveProgress: handleManualSave
  };
}

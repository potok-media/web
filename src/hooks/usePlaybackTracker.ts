import { useEffect, useRef, useCallback } from "react";
import { Storage } from "../utils/StorageService";
import { SyncApiClient } from "../network/SyncApiClient";
import { logger } from "../utils/logger";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";

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
    title?: string;
    originalTitle?: string;
    posterSrc?: string;
    backdropSrc?: string;
    streamHash?: string;
    fileIndex?: string;
    providerId?: string;
    voice?: string;
    sourceStream?: unknown;
    startAt?: number;
    stillSrc?: string;
  };
  seekOffset: number;
  isActive: boolean;
  duration: number;
  audioName?: string;
}

export function usePlaybackTracker({
  videoRef,
  playback,
  seekOffset,
  isActive,
  duration,
  audioName,
}: UsePlaybackTrackerParams) {
  const lastSavedTimeRef = useRef<number>(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { id, mediaType, season, episode } = playback;
  const audioNameRef = useRef(audioName);
  audioNameRef.current = audioName;

  // Reset last saved time when media ID / episode changes
  useEffect(() => {
    lastSavedTimeRef.current = 0;
  }, [id, season, episode]);

  // Continue cursor: announce as soon as this episode is opened, not after 15s / 2%.
  useEffect(() => {
    if (!playback.streamHash || playback.fileIndex == null || playback.fileIndex === "") return;
    const video = videoRef.current;
    const current = video?.currentTime ?? 0;
    const actual =
      seekOffset > 0
        ? seekOffset + current
        : playback.startAt && playback.startAt > 0
          ? playback.startAt
          : current;
    broadcastProgress(actual, duration, false);
    // Identity-only: a new file/episode should pin immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, season, episode, playback.streamHash, playback.fileIndex]);

  const getStorageKeys = useCallback(() => {
    const s = season ?? 0;
    const e = episode ?? 0;
    const progressKey = `potok_progress:${id}:${s}:${e}`;
    const resumeKey = `potok_playback_resume:${id}:${s}:${e}`;
    return { progressKey, resumeKey };
  }, [id, season, episode]);

  const broadcastProgress = useCallback((actualTime: number, durationVal: number, isCompleted: boolean) => {
    ExtensionRegistry.broadcast("PLAYBACK_PROGRESS", {
      id,
      mediaType,
      season,
      episode,
      title: playback.originalTitle || playback.title,
      posterSrc: playback.posterSrc,
      backdropSrc: playback.backdropSrc,
      streamHash: playback.streamHash,
      fileIndex: playback.fileIndex,
      providerId: playback.providerId,
      voice: audioNameRef.current || playback.voice,
      sourceStream: playback.sourceStream,
      stillSrc: playback.stillSrc,
      progressSeconds: Math.floor(Math.max(0, actualTime)),
      durationSeconds: Math.floor(Math.max(0, durationVal)),
      isCompleted,
    });
  }, [id, mediaType, season, episode, playback]);

  const saveProgress = useCallback((
    currentTime: number,
    durationVal: number,
    forceRemote: boolean = false
  ) => {
    if (durationVal <= 0) return;

    const actualTime = seekOffset > 0 ? (seekOffset + currentTime) : currentTime;
    const isCompleted = durationVal > 0 && actualTime / durationVal > 0.90;

    // Continue-watching cursor: fire as soon as the episode is running. Trakt/history stay gated below.
    broadcastProgress(actualTime, durationVal, isCompleted);

    // Порог начала (менее 15 секунд или 2% от длительности) — только для истории/Trakt, не для continue.
    if (actualTime < 15 || actualTime / durationVal < 0.02) {
      return;
    }

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
      // Remote history is keyed by TMDB id — a plugin-opened stream legitimately has id 0, so skip the remote
      // sync for it (local resume still works). Only sync when there's a real TMDB id.
      if (id > 0 && (strategy === "server" || strategy === "trakt")) {
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
  }, [id, mediaType, season, episode, seekOffset, getStorageKeys, playback, broadcastProgress]);

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
      broadcastProgress(duration, duration, true);

      // Удаляем с бэкенда/Trakt прогресс (переходит в статус полностью просмотрено)
      const strategy = Storage.get<string>("syncStrategy", "none");
      // Plugin streams have TMDB id 0 (a valid value) — don't push them to remote history.
      if (id > 0 && (strategy === "server" || strategy === "trakt")) {
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
  }, [videoRef, saveProgress, getStorageKeys, id, mediaType, season, episode, duration, broadcastProgress]);

  return {
    saveProgress: handleManualSave
  };
}

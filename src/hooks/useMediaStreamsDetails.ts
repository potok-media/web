import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHUD } from "../context/useHUD";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import type { StreamEpisode } from "@potok/sdk-types";
import { logger } from "../utils/logger";
import { SyncApiClient, type UserHistoryEntry } from "../network/SyncApiClient";
import { Storage } from "../utils/StorageService";
import type { PlaybackProgress } from "./usePlaybackTracker";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import { mapStreamEpisode } from "../utils/mediaStreamsPlayback";

interface UseMediaStreamsDetailsParams {
  mediaType?: string;
  mediaId: number;
  initialMedia?: MediaCard;
}

export function useMediaStreamsDetails({
  mediaType,
  mediaId,
  initialMedia,
}: UseMediaStreamsDetailsParams) {
  const { show: showHUD } = useHUD();
  const { i18n } = useTranslation();
  const [remoteHistory, setRemoteHistory] = useState<UserHistoryEntry[]>([]);

  const [mediaDetails, setMediaDetails] = useState<MediaCard | null>(() => {
    if (initialMedia) return initialMedia;
    if (mediaType && mediaId) {
      return ApiClient.getCachedMediaDetails(mediaType, mediaId);
    }
    return null;
  });

  const [loadingMediaDetails, setLoadingMediaDetails] = useState(() => {
    if (initialMedia) return false;
    if (mediaType && mediaId && ApiClient.getCachedMediaDetails(mediaType, mediaId)) {
      return false;
    }
    return true;
  });

  const handleOnError = useCallback(
    (err: unknown) => {
      logger.error(err);
      showHUD("error", err instanceof Error ? err.message : i18n.t("common:loadError"));
    },
    [showHUD, i18n],
  );

  useEffect(() => {
    const strategy = Storage.get<string>("syncStrategy", "none");
    if (strategy === "server" || strategy === "trakt") {
      SyncApiClient.fetchSyncHistory()
        .then((history) => {
          if (history) setRemoteHistory(history);
        })
        .catch((err) => logger.error("[useMediaStreams] Failed to load sync history:", err));
    }
  }, [mediaId]);

  useEffect(() => {
    if (initialMedia) {
      setMediaDetails(initialMedia);
      return;
    }
    if (!mediaType || !mediaId) return;

    const cached = ApiClient.getCachedMediaDetails(mediaType, mediaId);
    if (cached) {
      setMediaDetails(cached);
      setLoadingMediaDetails(false);
      return;
    }

    setLoadingMediaDetails(true);
    ApiClient.fetchMediaDetails(mediaType, mediaId)
      .then(setMediaDetails)
      .catch(handleOnError)
      .finally(() => setLoadingMediaDetails(false));
  }, [mediaType, mediaId, initialMedia, handleOnError, i18n.language]);

  const currentMedia = mediaDetails;

  const mapEpisodesWithWatched = useCallback(
    (epsList: StreamEpisode[]): GenericEpisodeItem[] =>
      (epsList || []).map((ep) => {
        const mapped = mapStreamEpisode(ep);
        const sNum = mapped.season;
        const epNum = mapped.episode;
        let isWatched = false;

        if (sNum !== undefined && epNum !== undefined) {
          if (
            currentMedia &&
            String(currentMedia.id) === String(mediaId) &&
            currentMedia.progress?.watchedEpisodes
          ) {
            isWatched = currentMedia.progress.watchedEpisodes.some(
              (we) => Number(we.season) === Number(sNum) && Number(we.number) === Number(epNum),
            );
          }

          if (!isWatched) {
            const entry = remoteHistory.find(
              (h) =>
                String(h.tmdbId) === String(mediaId) &&
                Number(h.seasonNumber) === Number(sNum) &&
                Number(h.episodeNumber) === Number(epNum),
            );
            if (entry) {
              isWatched =
                entry.progressSeconds >= entry.durationSeconds ||
                (entry.durationSeconds > 0 &&
                  entry.progressSeconds / entry.durationSeconds >= 0.9);
            }
          }

          if (!isWatched) {
            const progressKey = `potok_progress:${mediaId}:${sNum}:${epNum}`;
            const localProgress = Storage.get<PlaybackProgress | null>(progressKey, null);
            isWatched = localProgress?.isCompleted === true;
            if (!isWatched && localProgress && localProgress.durationSeconds > 0) {
              isWatched =
                localProgress.progressSeconds / localProgress.durationSeconds >= 0.9;
            }
          }
        }

        return { ...mapped, isWatched };
      }),
    [mediaId, remoteHistory, currentMedia],
  );

  return {
    loadingMediaDetails,
    currentMedia,
    handleOnError,
    mapEpisodesWithWatched,
  };
}
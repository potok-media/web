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
import { playbackStorageKeys } from "../utils/playbackIdentity";

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
      setLoadingMediaDetails(false);
      return;
    }
    if (!mediaType || !mediaId) return;

    const cached = ApiClient.getCachedMediaDetails(mediaType, mediaId);
    if (cached) {
      setMediaDetails(cached);
      setLoadingMediaDetails(false);
      return;
    }

    let cancelled = false;
    setMediaDetails(null);
    setLoadingMediaDetails(true);
    ApiClient.fetchMediaDetails(mediaType, mediaId)
      .then((details) => { if (!cancelled) setMediaDetails(details); })
      .catch((error) => { if (!cancelled) handleOnError(error); })
      .finally(() => { if (!cancelled) setLoadingMediaDetails(false); });
    return () => { cancelled = true; };
  }, [mediaType, mediaId, initialMedia, handleOnError, i18n.language]);

  const currentMedia = mediaDetails;

  const mapEpisodesWithWatched = useCallback(
    (epsList: StreamEpisode[]): GenericEpisodeItem[] =>
      (epsList || []).map((ep) => {
        const mapped = mapStreamEpisode(ep);
        const sNum = mapped.season;
        const epNum = mapped.episode;
        let isWatched = false;

        if (mapped.episodeId) {
          isWatched = currentMedia?.progress?.watchedEpisodeIds?.includes(mapped.episodeId) === true;
          if (!isWatched) {
            const entry = remoteHistory.find((item) => item.episodeId === mapped.episodeId);
            if (entry) {
              isWatched = entry.progressSeconds >= entry.durationSeconds
                || (entry.durationSeconds > 0
                  && entry.progressSeconds / entry.durationSeconds >= 0.9);
            }
          }
          if (!isWatched) {
            const { progressKey } = playbackStorageKeys({ ...mapped, id: mediaId, mediaType: "tv" });
            const local = Storage.get<PlaybackProgress | null>(progressKey, null);
            isWatched = local?.isCompleted === true || !!(local && local.durationSeconds > 0
              && local.progressSeconds / local.durationSeconds >= 0.9);
          }
        }

        // Files without episode coordinates (unresolved or joined): match the local progress the player
        // recorded under the plugin-owned opaque identity. Never fall back to a bare title-level key —
        // that would share one watched state across every unresolved file of the title.
        if (!isWatched && !mapped.episodeId && (sNum === undefined || epNum === undefined)
            && (mapped.progressId || mapped.url || ((mapped.episodeIds?.length ?? 0) > 1 && mapped.workId))) {
          const { progressKey } = playbackStorageKeys({
            id: mediaId,
            mediaType: "tv",
            workId: mapped.workId,
            episodeIds: mapped.episodeIds,
            progressId: mapped.progressId,
            streamUrl: mapped.url,
          });
          const local = Storage.get<PlaybackProgress | null>(progressKey, null);
          isWatched = local?.isCompleted === true || !!(local && local.durationSeconds > 0
            && local.progressSeconds / local.durationSeconds >= 0.9);
        }

        if (!isWatched && sNum !== undefined && epNum !== undefined) {
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

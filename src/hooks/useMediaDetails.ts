import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MediaCard } from "../network/ApiTypes";
import { useWSSync } from "../context/useWSSync";
import { fetchMediaDetailsData } from "./mediaDetails/mediaDetailsFetch";
import { applyMediaWsSyncEvent } from "./mediaDetails/mediaDetailsWsSync";
import { useMediaDetailsActions } from "./mediaDetails/useMediaDetailsActions";
import type { UseMediaDetailsProps } from "./mediaDetails/mediaDetailsTypes";

export type { UseMediaDetailsProps } from "./mediaDetails/mediaDetailsTypes";

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

  const { t } = useTranslation("media");
  const { subscribeToMedia } = useWSSync();

  const lastFetchTimeRef = useRef(0);
  const mediaRef = useRef<MediaCard | null>(null);
  const onNavigateToStreamsRef = useRef(onNavigateToStreams);
  const showHUDRef = useRef(showHUD);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    onNavigateToStreamsRef.current = onNavigateToStreams;
    showHUDRef.current = showHUD;
  }, [onNavigateToStreams, showHUD]);

  const fetchDetails = useCallback(
    async (silent = false) => {
      if (!mediaType || !mediaId) return;
      try {
        if (!silent) {
          setLoading(true);
          lastFetchTimeRef.current = Date.now() - 5000;
        }
        setError(null);

        const result = await fetchMediaDetailsData(mediaType, mediaId, silent);
        setMedia(result.media);
        setInWatchlist(result.inWatchlist);
        setIsFavorite(result.isFavorite);
        setIsWatched(result.isWatched);

        if (playParam === "true") {
          if (result.media.mediaType === "tv") {
            const s = result.media.progress?.nextSeason || 1;
            const e = result.media.progress?.nextEpisode || 1;
            onNavigateToStreamsRef.current(s, e);
          } else {
            onNavigateToStreamsRef.current();
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("details.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [mediaType, mediaId, playParam, t],
  );

  useEffect(() => {
    void fetchDetails(false);
  }, [fetchDetails]);

  useEffect(() => {
    if (!mediaId || !mediaType) return;

    const unsubscribe = subscribeToMedia(mediaId, mediaType, (event, payload, timestamp) => {
      const eventTime = new Date(timestamp).getTime();
      if (eventTime < lastFetchTimeRef.current) return;

      applyMediaWsSyncEvent(event, payload, mediaType, mediaRef, {
        setMedia,
        setIsWatched,
        setInWatchlist,
        setIsFavorite,
      });
    });

    return unsubscribe;
  }, [mediaId, mediaType, subscribeToMedia]);

  const actions = useMediaDetailsActions({
    media,
    inWatchlist,
    isFavorite,
    isWatched,
    setInWatchlist,
    setIsFavorite,
    setIsWatched,
    showHUDRef,
    refetch: fetchDetails,
    t,
  });

  return {
    media,
    loading,
    error,
    inWatchlist,
    isFavorite,
    isWatched,
    ...actions,
    refetch: fetchDetails,
  };
}
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { MediaCard } from "../network/ApiTypes";
import { useWSSync } from "../context/useWSSync";
import { fetchMediaDetailsData, fetchArmAnimeDetailsData } from "./mediaDetails/mediaDetailsFetch";
import { applyMediaWsSyncEvent } from "./mediaDetails/mediaDetailsWsSync";
import { useMediaDetailsActions } from "./mediaDetails/useMediaDetailsActions";
import type { ArmAnimeDetailsInput } from "../features/mediaDetails/armAnimeMedia";
import type { UseMediaDetailsProps } from "./mediaDetails/mediaDetailsTypes";

export type { UseMediaDetailsProps } from "./mediaDetails/mediaDetailsTypes";

export interface UseMediaDetailsArmAnimeOptions {
  /** ARM-side identity: anime works render from AniList/Shikimori metadata instead of TMDB. */
  armAnime?: ArmAnimeDetailsInput;
}

export function useMediaDetails({
  mediaType,
  mediaId,
  playParam,
  onNavigateToStreams,
  showHUD,
  armAnime,
}: UseMediaDetailsProps & UseMediaDetailsArmAnimeOptions) {
  const [media, setMedia] = useState<MediaCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  const { t, i18n } = useTranslation("media");
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
      if (armAnime) {
        try {
          if (!silent) setLoading(true);
          setError(null);
          const result = await fetchArmAnimeDetailsData(armAnime, i18n.language, t);
          setMedia(result.media);
          setInWatchlist(result.inWatchlist);
          setIsFavorite(result.isFavorite);
          setIsWatched(result.isWatched);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : t("details.loadFailed"));
        } finally {
          setLoading(false);
        }
        return;
      }
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
    [mediaType, mediaId, playParam, t, armAnime, i18n.language],
  );

  useEffect(() => {
    void fetchDetails(false);
  }, [fetchDetails]);

  useEffect(() => {
    // Anime-synthesized cards have no tmdb identity — nothing to subscribe to.
    if (!mediaId || !mediaType || armAnime) return;

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
  }, [mediaId, mediaType, subscribeToMedia, armAnime]);

  const actions = useMediaDetailsActions({
    media,
    inWatchlist,
    isFavorite,
    isWatched,
    setInWatchlist,
    setIsFavorite,
    setIsWatched,
    setMedia,
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

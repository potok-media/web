import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SyncApiClient } from "../../network/SyncApiClient";
import type { TvEpisode } from "../../network/ApiTypes";
import {
  applyEpisodeWatchedState,
  toTitleWatchedBulkRequests,
} from "../../features/arm/episodeHistoryModel";
import { resolveTitleEpisodes } from "../../features/mediaDetails/titleEpisodeResolver";
import { checkIsWatched, mergeWatchedEpisodes } from "./mediaDetailsUtils";
import type { UseMediaDetailsActionsParams } from "./mediaDetailsTypes";

type SocialActionsParams = Pick<
  UseMediaDetailsActionsParams,
  | "media"
  | "inWatchlist"
  | "isFavorite"
  | "isWatched"
  | "setInWatchlist"
  | "setIsFavorite"
  | "setIsWatched"
  | "setMedia"
  | "showHUDRef"
  | "refetch"
  | "t"
>;

export function useMediaDetailsSocialActions({
  media,
  inWatchlist,
  isFavorite,
  isWatched,
  setInWatchlist,
  setIsFavorite,
  setIsWatched,
  setMedia,
  showHUDRef,
  refetch,
  t,
}: SocialActionsParams) {
  const { i18n } = useTranslation("media");

  const toggleWatchlist = useCallback(async () => {
    if (!media) return;
    try {
      const nextState = !inWatchlist;
      setInWatchlist(nextState);
      if (nextState) {
        await SyncApiClient.addSyncWatchlist(media.id.toString(), media.mediaType);
      } else {
        await SyncApiClient.removeSyncWatchlist(media.id.toString(), media.mediaType);
      }
      showHUDRef.current("success", nextState ? t("watchlist.added") : t("watchlist.removed"));
      await refetch(true);
    } catch {
      setInWatchlist(media.isInWatchlist || false);
      showHUDRef.current("error", t("details.toasts.watchlistError"));
    }
  }, [media, inWatchlist, setInWatchlist, showHUDRef, refetch, t]);

  const toggleFavorite = useCallback(async () => {
    if (!media) return;
    try {
      const nextState = !isFavorite;
      setIsFavorite(nextState);
      if (nextState) {
        await SyncApiClient.addSyncFavorite(media.id.toString(), media.mediaType);
      } else {
        await SyncApiClient.removeSyncFavorite(media.id.toString(), media.mediaType);
      }
      showHUDRef.current(
        "success",
        nextState ? t("details.toasts.favoriteAdded") : t("details.toasts.favoriteRemoved"),
      );
      await refetch(true);
    } catch {
      setIsFavorite(media.isFavorite || false);
      showHUDRef.current("error", t("details.toasts.favoriteError"));
    }
  }, [media, isFavorite, setIsFavorite, showHUDRef, refetch, t]);

  /**
   * Title-level «Просмотреть» — a whole-title toggle with owner semantics.
   * ON: EVERY episode of the title is enumerated (ARM graph first, legacy seasons fallback) and
   * bulk-marked; the server writes is_watched flagged rows per episode identity.
   * OFF: the whole-title clear endpoint removes EVERY history row for the title — both identity
   * spaces, all seasons/episodes — with no client-side enumeration that could miss rows; the
   * status cache is recounted server-side. Episodes can be passed by the caller for the ON
   * path; otherwise they are resolved lazily.
   * Optimistic local update with rollback on failure — the server filters out our own WS echo
   * by client id, so the local state is the only immediate feedback; the unconditional
   * reconciling refetch afterwards replaces it with server truth.
   */
  const toggleWatched = useCallback(async (episodes?: TvEpisode[]) => {
    if (!media) return;
    const nextState = !isWatched;

    if (media.mediaType === "tv") {
      if (!nextState) {
        // Whole-title clear — no enumeration: even rows the page never loaded must go.
        const previousMedia = media;
        const previousIsWatched = isWatched;
        setMedia(mergeWatchedEpisodes(media, [], media.mediaType, false, []));
        setIsWatched(false);
        try {
          await SyncApiClient.removeHistoryTitle({
            tmdbId: media.id.toString(),
            mediaType: "tv",
            ...(media.arm?.workId ? { workId: media.arm.workId } : {}),
          });
          showHUDRef.current("success", t("details.toasts.historyRemoved"));
          await refetch(true);
        } catch {
          setMedia(previousMedia);
          setIsWatched(previousIsWatched);
          showHUDRef.current("error", t("details.toasts.historyError"));
        }
        return;
      }

      const titleEpisodes =
        episodes && episodes.length > 0 ? episodes : await resolveTitleEpisodes(media, i18n.language);
      if (titleEpisodes.length > 0) {
        const previousMedia = media;
        const previousIsWatched = isWatched;
        const requests = toTitleWatchedBulkRequests(media, titleEpisodes, nextState);
        if (requests.length > 0) {
          setMedia(applyEpisodeWatchedState(media, titleEpisodes, nextState));
          setIsWatched(nextState);
          try {
            for (const request of requests) {
              await SyncApiClient.saveHistoryBulkProgress(request);
            }
            showHUDRef.current(
              "success",
              nextState ? t("details.toasts.historyMarked") : t("details.toasts.historyRemoved"),
            );
            await refetch(true);
          } catch {
            setMedia(previousMedia);
            setIsWatched(previousIsWatched);
            showHUDRef.current("error", t("details.toasts.historyError"));
          }
          return;
        }
      }
      // No episode list available (guest/offline ARM): keep the title-level mutation as a fallback.
    }

    try {
      setIsWatched(nextState);
      if (nextState) {
        await SyncApiClient.saveSyncProgress(
          media.id.toString(),
          media.mediaType,
          undefined,
          undefined,
          100,
          100,
        );
      } else {
        await SyncApiClient.removeSyncProgress(
          media.id.toString(),
          media.mediaType,
          undefined,
          undefined,
        );
      }
      showHUDRef.current(
        "success",
        nextState ? t("details.toasts.historyMarked") : t("details.toasts.historyRemoved"),
      );
      await refetch(true);
    } catch {
      setIsWatched(checkIsWatched(media));
      showHUDRef.current("error", t("details.toasts.historyError"));
    }
  }, [media, isWatched, setIsWatched, setMedia, showHUDRef, refetch, t, i18n.language]);

  return { toggleWatchlist, toggleFavorite, toggleWatched };
}
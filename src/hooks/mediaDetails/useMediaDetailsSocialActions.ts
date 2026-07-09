import { useCallback } from "react";
import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";
import { Storage } from "../../utils/StorageService";
import { buildTraktPayload, checkIsWatched } from "./mediaDetailsUtils";
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
  showHUDRef,
  refetch,
  t,
}: SocialActionsParams) {
  const toggleWatchlist = useCallback(async () => {
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
        await ApiClient.syncTraktAction(
          nextState ? "watchlist" : "watchlist/remove",
          buildTraktPayload(media),
        );
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
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
        if (nextState) {
          await SyncApiClient.addSyncFavorite(media.id.toString(), media.mediaType);
        } else {
          await SyncApiClient.removeSyncFavorite(media.id.toString(), media.mediaType);
        }
      } else {
        await ApiClient.syncTraktAction(
          nextState ? "favorites" : "favorites/remove",
          buildTraktPayload(media),
        );
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

  const toggleWatched = useCallback(async () => {
    if (!media) return;
    try {
      const nextState = !isWatched;
      setIsWatched(nextState);
      const strategy = Storage.get<string>("syncStrategy", "none");
      if (strategy === "server") {
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
      } else {
        await ApiClient.syncTraktAction(
          nextState ? "history" : "history/remove",
          buildTraktPayload(media),
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
  }, [media, isWatched, setIsWatched, showHUDRef, refetch, t]);

  return { toggleWatchlist, toggleFavorite, toggleWatched };
}
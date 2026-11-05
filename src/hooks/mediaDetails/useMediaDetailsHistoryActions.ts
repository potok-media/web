import { useCallback } from "react";
import { SyncApiClient } from "../../network/SyncApiClient";
import type { TvEpisode } from "../../network/ApiTypes";
import {
  applyEpisodeWatchedState,
  toBulkEpisodeHistoryRequest,
  toEpisodeHistoryIdentity,
} from "../../features/arm/episodeHistoryModel";
import type { EpisodeSelection, UseMediaDetailsActionsParams } from "./mediaDetailsTypes";

type HistoryActionsParams = Pick<
  UseMediaDetailsActionsParams,
  "media" | "setMedia" | "showHUDRef" | "refetch" | "t"
>;

/**
 * Episode-level history mutations. Pattern (same as the social actions): optimistic local update
 * via `applyEpisodeWatchedState` so the ticks flip instantly, rollback to the previous media on
 * failure, then an unconditional silent refetch to reconcile with the server — the merge replaces
 * the watched sets wholesale, so removals clear ticks and the hero state instead of only adding.
 * The server filters out our own WS echo by client id, so without the optimistic step nothing
 * would move until this refetch lands.
 */
export function useMediaDetailsHistoryActions({
  media,
  setMedia,
  showHUDRef,
  refetch,
  t,
}: HistoryActionsParams) {
  const toggleEpisodeWatched = useCallback(
    async (episode: TvEpisode, nextState: boolean) => {
      if (!media) return;
      const identity = toEpisodeHistoryIdentity(media, episode);
      const previousMedia = media;
      setMedia(applyEpisodeWatchedState(media, [episode], nextState));
      try {
        if (nextState) {
          await SyncApiClient.saveHistoryProgress({
            ...identity,
            progressSeconds: 100,
            durationSeconds: 100,
          });
        } else {
          await SyncApiClient.removeHistoryProgress({
            ...identity,
          });
        }
        showHUDRef.current(
          "success",
          nextState
            ? t("details.toasts.episodeMarked", { number: episode.armNumber ?? episode.episodeNumber })
            : t("details.toasts.episodeRemoved", { number: episode.armNumber ?? episode.episodeNumber }),
        );
        // Reconcile with the server for both identity spaces: the ARM-keyed delete can leave a
        // legacy-coordinate row behind (and vice versa), and the hero state only updates from
        // this refetch — skipping it for ARM identities left removed ticks lit.
        await refetch(true);
      } catch {
        setMedia(previousMedia);
        showHUDRef.current("error", t("details.toasts.episodeError"));
      }
    },
    [media, setMedia, showHUDRef, refetch, t],
  );

  const toggleSeasonWatched = useCallback(
    async (
      seasonNumber: number | undefined,
      episodesList: TvEpisode[],
      nextState: boolean,
      groupTitle?: string,
    ) => {
      if (!media) return;
      const request = toBulkEpisodeHistoryRequest(media, episodesList, nextState);
      const previousMedia = media;
      setMedia(applyEpisodeWatchedState(media, episodesList, nextState));
      try {
        await SyncApiClient.saveHistoryBulkProgress({
          ...request,
        });
        showHUDRef.current(
          "success",
          groupTitle
            ? nextState
              ? t("details.toasts.groupMarked", { title: groupTitle })
              : t("details.toasts.groupRemoved", { title: groupTitle })
            : nextState
              ? t("details.toasts.seasonMarked", { number: seasonNumber })
              : t("details.toasts.seasonRemoved", { number: seasonNumber }),
        );
        await refetch(true);
      } catch {
        setMedia(previousMedia);
        showHUDRef.current("error", t("details.toasts.seasonError"));
      }
    },
    [media, setMedia, showHUDRef, refetch, t],
  );

  const saveEpisodeSelection = useCallback(
    async (newSelection: EpisodeSelection[]) => {
      if (!media) return;
      const initial = media.progress?.watchedEpisodes || [];
      const toAdd = newSelection.filter(
        (ns) => !initial.some((init) => init.season === ns.season && init.number === ns.number),
      );
      const toRemove = initial.filter(
        (init) => !newSelection.some((ns) => ns.season === init.season && ns.number === init.number),
      );

      if (toAdd.length === 0 && toRemove.length === 0) return;

      const changes = [
        ...toAdd.map((item) => ({
          seasonNumber: item.season,
          episodeNumber: item.number,
          isWatched: true,
        })),
        ...toRemove.map((item) => ({
          seasonNumber: item.season,
          episodeNumber: item.number,
          isWatched: false,
        })),
      ];

      // Optimistic: move the legacy-coordinate ticks immediately; the silent refetch after the
      // save reconciles ARM-identity rows with the server. Rollback on failure.
      const previousMedia = media;
      const toEpisodeStub = (item: EpisodeSelection): TvEpisode => ({
        id: `selection-${item.season}-${item.number}`,
        name: "",
        seasonNumber: item.season,
        episodeNumber: item.number,
      });
      let nextMedia = media;
      if (toAdd.length > 0) {
        nextMedia = applyEpisodeWatchedState(nextMedia, toAdd.map(toEpisodeStub), true);
      }
      if (toRemove.length > 0) {
        nextMedia = applyEpisodeWatchedState(nextMedia, toRemove.map(toEpisodeStub), false);
      }
      setMedia(nextMedia);

      try {
        await SyncApiClient.saveSyncBulkProgress(media.id.toString(), "tv", changes);
        showHUDRef.current("success", t("details.toasts.historyUpdated"));
        await refetch(true);
      } catch {
        setMedia(previousMedia);
        showHUDRef.current("error", t("details.toasts.historySaveError"));
      }
    },
    [media, setMedia, showHUDRef, refetch, t],
  );

  return { toggleEpisodeWatched, toggleSeasonWatched, saveEpisodeSelection };
}

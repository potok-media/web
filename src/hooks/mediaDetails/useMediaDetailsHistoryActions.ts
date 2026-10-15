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
      try {
        const identity = toEpisodeHistoryIdentity(media, episode);
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
        if (identity.episodeId) {
          setMedia(applyEpisodeWatchedState(media, [episode], nextState));
        }
        showHUDRef.current(
          "success",
          nextState
            ? t("details.toasts.episodeMarked", { number: episode.armNumber ?? episode.episodeNumber })
            : t("details.toasts.episodeRemoved", { number: episode.armNumber ?? episode.episodeNumber }),
        );
        if (!identity.episodeId) await refetch(true);
      } catch {
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
      try {
        const request = toBulkEpisodeHistoryRequest(media, episodesList, nextState);
        await SyncApiClient.saveHistoryBulkProgress({
          ...request,
        });
        if (request.workId) {
          setMedia(applyEpisodeWatchedState(media, episodesList, nextState));
        }
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
        if (!request.workId) await refetch(true);
      } catch {
        showHUDRef.current("error", t("details.toasts.seasonError"));
      }
    },
    [media, setMedia, showHUDRef, refetch, t],
  );

  const saveEpisodeSelection = useCallback(
    async (newSelection: EpisodeSelection[]) => {
      if (!media) return;
      try {
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

        await SyncApiClient.saveSyncBulkProgress(media.id.toString(), "tv", changes);
        showHUDRef.current("success", t("details.toasts.historyUpdated"));
        await refetch(true);
      } catch {
        showHUDRef.current("error", t("details.toasts.historySaveError"));
      }
    },
    [media, showHUDRef, refetch, t],
  );

  return { toggleEpisodeWatched, toggleSeasonWatched, saveEpisodeSelection };
}

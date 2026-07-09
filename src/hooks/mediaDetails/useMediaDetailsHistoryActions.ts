import { useCallback } from "react";
import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";
import { Storage } from "../../utils/StorageService";
import type { EpisodeSelection, UseMediaDetailsActionsParams } from "./mediaDetailsTypes";

type HistoryActionsParams = Pick<
  UseMediaDetailsActionsParams,
  "media" | "showHUDRef" | "refetch" | "t"
>;

export function useMediaDetailsHistoryActions({
  media,
  showHUDRef,
  refetch,
  t,
}: HistoryActionsParams) {
  const toggleEpisodeWatched = useCallback(
    async (seasonNumber: number, episodeNumber: number, nextState: boolean) => {
      if (!media) return;
      try {
        const strategy = Storage.get<string>("syncStrategy", "none");
        if (strategy === "server") {
          if (nextState) {
            await SyncApiClient.saveSyncProgress(
              media.id.toString(),
              "tv",
              seasonNumber,
              episodeNumber,
              100,
              100,
            );
          } else {
            await SyncApiClient.removeSyncProgress(
              media.id.toString(),
              "tv",
              seasonNumber,
              episodeNumber,
            );
          }
        } else {
          const payload = {
            movies: [],
            shows: [
              {
                ids: { tmdb: media.id },
                seasons: [{ number: seasonNumber, episodes: [{ number: episodeNumber }] }],
              },
            ],
            episodes: [],
          };
          await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
        }
        showHUDRef.current(
          "success",
          nextState
            ? t("details.toasts.episodeMarked", { number: episodeNumber })
            : t("details.toasts.episodeRemoved", { number: episodeNumber }),
        );
        await refetch(true);
      } catch {
        showHUDRef.current("error", t("details.toasts.episodeError"));
      }
    },
    [media, showHUDRef, refetch, t],
  );

  const toggleSeasonWatched = useCallback(
    async (seasonNumber: number, episodesList: { episodeNumber: number }[], nextState: boolean) => {
      if (!media) return;
      try {
        const strategy = Storage.get<string>("syncStrategy", "none");
        if (strategy === "server") {
          if (nextState) {
            await Promise.all(
              episodesList.map((ep) =>
                SyncApiClient.saveSyncProgress(
                  media.id.toString(),
                  "tv",
                  seasonNumber,
                  ep.episodeNumber,
                  100,
                  100,
                ),
              ),
            );
          } else {
            await Promise.all(
              episodesList.map((ep) =>
                SyncApiClient.removeSyncProgress(
                  media.id.toString(),
                  "tv",
                  seasonNumber,
                  ep.episodeNumber,
                ),
              ),
            );
          }
        } else {
          const payload = {
            movies: [],
            shows: [
              {
                ids: { tmdb: media.id },
                seasons: [
                  {
                    number: seasonNumber,
                    episodes: episodesList.map((ep) => ({ number: ep.episodeNumber })),
                  },
                ],
              },
            ],
            episodes: [],
          };
          await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
        }
        showHUDRef.current(
          "success",
          nextState
            ? t("details.toasts.seasonMarked", { number: seasonNumber })
            : t("details.toasts.seasonRemoved", { number: seasonNumber }),
        );
        await refetch(true);
      } catch {
        showHUDRef.current("error", t("details.toasts.seasonError"));
      }
    },
    [media, showHUDRef, refetch, t],
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
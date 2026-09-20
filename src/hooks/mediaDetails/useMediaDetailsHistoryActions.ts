import { useCallback } from "react";
import { ApiClient } from "../../network/ApiClient";
import { SyncApiClient } from "../../network/SyncApiClient";
import { Storage } from "../../utils/StorageService";
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
        const strategy = Storage.get<string>("syncStrategy", "none");
        const identity = toEpisodeHistoryIdentity(media, episode);
        if (strategy === "server" || identity.workId) {
          if (nextState) {
            await SyncApiClient.saveHistoryProgress({
              ...identity,
              progressSeconds: 100,
              durationSeconds: 100,
              syncTrakt: strategy === "trakt",
            });
          } else {
            await SyncApiClient.removeHistoryProgress({
              ...identity,
              syncTrakt: strategy === "trakt",
            });
          }
        } else {
          const payload = {
            movies: [],
            shows: [
              {
                ids: { tmdb: media.id },
                seasons: [{ number: episode.seasonNumber, episodes: [{ number: episode.episodeNumber }] }],
              },
            ],
            episodes: [],
          };
          await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
        }
        if (identity.episodeId) {
          setMedia(applyEpisodeWatchedState(media, [episode], nextState));
        }
        showHUDRef.current(
          "success",
          nextState
            ? t("details.toasts.episodeMarked", { number: episode.armOrdinal ?? episode.episodeNumber })
            : t("details.toasts.episodeRemoved", { number: episode.armOrdinal ?? episode.episodeNumber }),
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
        const strategy = Storage.get<string>("syncStrategy", "none");
        const request = toBulkEpisodeHistoryRequest(media, episodesList, nextState);
        if (strategy === "server" || request.workId) {
          await SyncApiClient.saveHistoryBulkProgress({
            ...request,
            syncTrakt: strategy === "trakt",
          });
        } else {
          const legacySeasonNumber = seasonNumber ?? episodesList[0]?.seasonNumber ?? 1;
          const payload = {
            movies: [],
            shows: [
              {
                ids: { tmdb: media.id },
                seasons: [
                  {
                    number: legacySeasonNumber,
                    episodes: episodesList.map((ep) => ({ number: ep.episodeNumber })),
                  },
                ],
              },
            ],
            episodes: [],
          };
          await ApiClient.syncTraktAction(nextState ? "history" : "history/remove", payload);
        }
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

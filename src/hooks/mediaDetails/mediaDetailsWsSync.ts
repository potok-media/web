import { ApiClient } from "../../network/ApiClient";
import type { MediaCard } from "../../network/ApiTypes";
import { checkIsWatched, mergeWatchedEpisodes } from "./mediaDetailsUtils";

interface WsSyncPayload {
  seasonNumber?: number;
  episodeNumber?: number;
  isWatched?: boolean;
  episodeId?: string;
  changes?: {
    seasonNumber?: number;
    episodeNumber?: number;
    episodeId?: string;
    isWatched: boolean;
  }[];
  listType?: string;
  action?: string;
}

export interface WsSyncSetters {
  setMedia: (media: MediaCard) => void;
  setIsWatched: (watched: boolean) => void;
  setInWatchlist: (value: boolean) => void;
  setIsFavorite: (value: boolean) => void;
}

export function applyMediaWsSyncEvent(
  event: string,
  payload: WsSyncPayload,
  mediaType: string,
  mediaRef: { current: MediaCard | null },
  setters: WsSyncSetters,
): void {
  ApiClient.invalidateCache();

  if (event === "sync:history:changed") {
    const { seasonNumber, episodeNumber, episodeId, isWatched: watchState } = payload;
    const prev = mediaRef.current;
    if (!prev || watchState === undefined) return;

    let watchedEpisodes = [...(prev.progress?.watchedEpisodes || [])];
    const watchedEpisodeIds = new Set(prev.progress?.watchedEpisodeIds ?? []);
    if (episodeId) {
      if (watchState) watchedEpisodeIds.add(episodeId);
      else watchedEpisodeIds.delete(episodeId);
    }
    if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
      if (watchState) {
        if (!watchedEpisodes.some((ep) => ep.season === seasonNumber && ep.number === episodeNumber)) {
          watchedEpisodes.push({ season: seasonNumber, number: episodeNumber });
        }
      } else {
        watchedEpisodes = watchedEpisodes.filter(
          (ep) => !(ep.season === seasonNumber && ep.number === episodeNumber),
        );
      }
    }

    const updatedMedia = mergeWatchedEpisodes(
      prev,
      watchedEpisodes,
      mediaType,
      watchState,
      [...watchedEpisodeIds],
    );
    mediaRef.current = updatedMedia;
    setters.setMedia(updatedMedia);
    setters.setIsWatched(mediaType === "movie" ? watchState : checkIsWatched(updatedMedia));
    return;
  }

  if (event === "sync:history:batch_changed") {
    const { changes } = payload;
    const prev = mediaRef.current;
    if (!prev || !changes) return;

    let watchedEpisodes = [...(prev.progress?.watchedEpisodes || [])];
    const watchedEpisodeIds = new Set(prev.progress?.watchedEpisodeIds ?? []);
    for (const ch of changes) {
      const { seasonNumber, episodeNumber, episodeId, isWatched: watchState } = ch;
      if (episodeId) {
        if (watchState) watchedEpisodeIds.add(episodeId);
        else watchedEpisodeIds.delete(episodeId);
      }
      if (seasonNumber === undefined || episodeNumber === undefined) continue;
      if (watchState) {
        if (!watchedEpisodes.some((ep) => ep.season === seasonNumber && ep.number === episodeNumber)) {
          watchedEpisodes.push({ season: seasonNumber, number: episodeNumber });
        }
      } else {
        watchedEpisodes = watchedEpisodes.filter(
          (ep) => !(ep.season === seasonNumber && ep.number === episodeNumber),
        );
      }
    }

    const updatedMedia = mergeWatchedEpisodes(
      prev,
      watchedEpisodes,
      mediaType,
      undefined,
      [...watchedEpisodeIds],
    );
    mediaRef.current = updatedMedia;
    setters.setMedia(updatedMedia);
    setters.setIsWatched(checkIsWatched(updatedMedia));
    return;
  }

  if (event === "sync:library:updated") {
    const { listType, action } = payload;
    if (listType === "watchlist") {
      setters.setInWatchlist(action === "add");
    } else if (listType === "favorites") {
      setters.setIsFavorite(action === "add");
    }
  }
}

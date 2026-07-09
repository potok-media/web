import type { GenericEpisodeItem } from "../../components/common/episodeSelector/types";
import type { MediaCard } from "../../network/ApiTypes";
import type { StreamEpisode } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../../context/playbackTypes";
import type { PlaybackInfo } from "@potok/sdk-types";

export type StreamSource = {
  id: string;
  name: string;
  supportedTypes: ("movie" | "tv")[];
  pluginId: string;
};

export interface StreamContext {
  type: "movie" | "tv";
  tmdbId: number;
  title: string;
  season?: number;
  episode?: number;
}

export interface EpisodeSelectorData {
  title: string;
  episodes: GenericEpisodeItem[];
  tmdbSeasonsCount: number;
  seasonMap?: Record<string, { season: number; offset: number }>;
}

export interface EpisodesResponse {
  episodes: StreamEpisode[];
  tmdbSeasonsCount: number;
  seasonMap?: Record<string, { season: number; offset: number }>;
}

export interface PlaylistResolveBridge {
  potok_playlist_override?: ActivePlayback["playlist"];
  potok_playlist_resolve?: (item: PlaylistItem) => Promise<PlaybackInfo>;
}

export interface MediaStreamsPlaybackContext {
  mediaType?: string;
  mediaId: number;
  currentMedia: MediaCard | null;
}

export function buildEpisodeSelectorData(
  streamTitle: string | undefined,
  mediaType: string | undefined,
  episodes: StreamEpisode[],
  tmdbSeasonsCount: number,
  seasonMap: Record<string, { season: number; offset: number }> | undefined,
  currentMedia: MediaCard | null,
  mapEpisodesWithWatched: (eps: StreamEpisode[]) => GenericEpisodeItem[],
  labels: { fileSelection: string; episodeSelection: string },
): EpisodeSelectorData {
  return {
    title:
      streamTitle ||
      (mediaType === "movie" ? labels.fileSelection : labels.episodeSelection),
    episodes: mapEpisodesWithWatched(episodes),
    tmdbSeasonsCount: tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
    seasonMap: seasonMap || {},
  };
}
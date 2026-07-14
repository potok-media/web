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
  // Optional capability flags declared by the plugin at registration (SDK gate). fileOverride enables the
  // per-file anchor/pin editing UI in the episode selector.
  capabilities?: { fileOverride?: boolean };
};

export interface StreamContext {
  type: "movie" | "tv";
  tmdbId: number;
  title: string;
  season?: number;
  episode?: number;
}

export type FileOverrideMap = Record<string, { season: number; episode: number; mode: string }>;

export interface EpisodeSelectorData {
  title: string;
  episodes: GenericEpisodeItem[];
  tmdbSeasonsCount: number;
  seasonMap?: Record<string, { season: number; offset: number }>;
  fileMap?: FileOverrideMap;
  // Plugin-provided parse-quality verdict (it owns the parser + the release title). When set, the selector
  // trusts it over its own generic numeric heuristic. Undefined = plugin gave no opinion → host falls back.
  parsingSuspect?: boolean;
}

export interface EpisodesResponse {
  episodes: StreamEpisode[];
  tmdbSeasonsCount: number;
  seasonMap?: Record<string, { season: number; offset: number }>;
  fileMap?: FileOverrideMap;
  parsingSuspect?: boolean;
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
  parsingSuspect?: boolean,
  fileMap?: FileOverrideMap,
): EpisodeSelectorData {
  return {
    title:
      streamTitle ||
      (mediaType === "movie" ? labels.fileSelection : labels.episodeSelection),
    episodes: mapEpisodesWithWatched(episodes),
    tmdbSeasonsCount: tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
    seasonMap: seasonMap || {},
    fileMap: fileMap || {},
    parsingSuspect,
  };
}
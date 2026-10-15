import type { PlaylistItem } from "../context/playbackTypes";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";

interface EpisodePlaylistLabels {
  fallbackEpisodeTitle: (episode: number) => string;
  unresolvedTitle: string;
  mainStreamTitle: string;
}

const detectStreamType = (streamUrl: string): PlaylistItem["streamType"] => {
  if (!streamUrl) return undefined;
  if (streamUrl.includes(".m3u8")) return "m3u8";
  if (streamUrl.includes(".mpd")) return "dash";
  return "mp4";
};

export const buildEpisodePlaylist = (
  episodes: GenericEpisodeItem[],
  labels: EpisodePlaylistLabels,
): PlaylistItem[] => {
  const playlist: PlaylistItem[] = [];

  for (const episode of episodes) {
    const streamUrl = episode.url || episode.audios?.[0]?.url || "";

    playlist.push({
      id: episode.id,
      workId: episode.workId,
      episodeId: episode.episodeId,
      entryId: episode.entryId,
      episodeIds: episode.episodeIds,
      targets: episode.targets,
      season: episode.season,
      episode: episode.episode,
      title: episode.title || episode.fileName || (episode.episode !== undefined
        ? labels.fallbackEpisodeTitle(episode.episode)
        : labels.unresolvedTitle),
      filler: episode.filler ?? null,
      streamUrl,
      streamType: detectStreamType(streamUrl),
      audios: episode.audios?.map((audio) => ({ name: audio.name, url: audio.url || "" })),
      voice: episode.audios?.[0]?.name || labels.mainStreamTitle,
    });
  }

  return playlist;
};

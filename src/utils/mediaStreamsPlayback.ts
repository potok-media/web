import type { PlaybackInfo } from "@potok/sdk-types";
import type { StreamEpisode } from "@potok/sdk-types";
import type { ActivePlayback } from "../context/playbackTypes";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";

const ALLOWED_STREAM_TYPES = ["m3u8", "hls", "mp4", "dash"] as const;

export const mapStreamEpisode = (ep: StreamEpisode): GenericEpisodeItem => ({
  id: ep.id,
  season: ep.season,
  episode: ep.episode,
  title: ep.title,
  rawSeason: ep.rawSeason,
  rawEpisode: ep.rawEpisode,
  fileName: ep.fileName,
  sizeLabel: ep.sizeLabel,
  stillPath: ep.stillPath,
  airDate: ep.airDate,
  audios: ep.audios || [],
  url: ep.url,
});

export const buildPlaybackFromInfo = (
  info: PlaybackInfo,
  base: {
    mediaType: "movie" | "tv";
    id: number;
    title?: string;
    originalTitle?: string;
    englishTitle?: string;
    season?: number;
    episode?: number;
    playlist?: ActivePlayback["playlist"];
    playlistIndex?: number;
  },
): ActivePlayback => ({
  streamUrl: info.streamUrl,
  title: info.title || base.title || "",
  originalTitle: base.originalTitle,
  englishTitle: base.englishTitle,
  mediaType: base.mediaType,
  id: base.id,
  season: base.season,
  episode: base.episode,
  streamHash: info.torrentHash,
  fileIndex: info.fileIndex,
  streamType: ALLOWED_STREAM_TYPES.includes(
    info.streamType as (typeof ALLOWED_STREAM_TYPES)[number],
  )
    ? (info.streamType as ActivePlayback["streamType"])
    : undefined,
  audios: info.audios?.map((a) => ({ name: a.name, url: a.url })),
  headers: info.headers,
  providerId: info.providerId,
  voice: info.voice,
  subtitles: info.subtitles,
  session: info.session,
  duration: info.duration,
  introStart: info.introStart,
  introEnd: info.introEnd,
  outroStart: info.outroStart,
  outroEnd: info.outroEnd,
  thumbnails: info.thumbnails,
  requiresBuffering: info.requiresBuffering,
  playlist: base.playlist,
  playlistIndex: base.playlistIndex,
});
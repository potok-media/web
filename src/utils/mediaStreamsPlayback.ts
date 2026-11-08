import type { PlaybackInfo, StreamEpisode, SDKReleaseBindingTarget } from "@potok/sdk-types";
import type { ActivePlayback, AudioTrackEntry, PlaylistItem } from "../context/playbackTypes";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";

const ALLOWED_STREAM_TYPES = ["m3u8", "hls", "mp4", "dash"] as const;

export const mapStreamEpisode = (ep: StreamEpisode): GenericEpisodeItem => ({
  id: ep.id,
  season: ep.season,
  episode: ep.episode,
  title: ep.title,
  rawSeason: ep.rawSeason,
  rawEpisode: ep.rawEpisode,
  workId: ep.workId,
  episodeId: ep.episodeId,
  entryId: ep.entryId,
  groupTitle: ep.groupTitle,
  groupDisplayNumber: ep.groupDisplayNumber,
  groupKind: ep.groupKind,
  displayOrdinal: ep.displayOrdinal,
  episodeIds: ep.episodeIds,
  targets: ep.targets,
  resolutionState: ep.resolutionState,
  confidence: ep.confidence,
  bindingMethod: ep.bindingMethod,
  rawEvidence: ep.rawEvidence,
  alternatives: ep.alternatives,
  filler: ep.filler,
  fileName: ep.fileName,
  sizeLabel: ep.sizeLabel,
  stillPath: ep.stillPath,
  airDate: ep.airDate,
  progressId: ep.progressId,
  audios: ep.audios || [],
  url: ep.url,
});

interface PlaybackInfoBase {
  mediaType: "movie" | "tv";
  id: number;
  title?: string;
  originalTitle?: string;
  englishTitle?: string;
  backdropSrc?: string;
  posterSrc?: string;
  /** Identity of the episode being opened — patched into the current playlist item. */
  season?: number;
  episode?: number;
  workId?: string | null;
  episodeId?: string | null;
  entryId?: string | null;
  episodeIds?: string[];
  targets?: SDKReleaseBindingTarget[];
  progressId?: string;
  /** Pre-built episode-selector window (ready urls); the resolved item patches the current index. */
  playlist?: PlaylistItem[];
  playlistIndex?: number;
  providerId?: string;
  startAt?: number;
  sourceStream?: unknown;
  stillSrc?: string;
  mount?: ActivePlayback["mount"];
}

interface ResolvedItemShape {
  id?: string;
  workId?: string | null;
  episodeId?: string | null;
  entryId?: string | null;
  episodeIds?: string[];
  targets?: SDKReleaseBindingTarget[];
  season?: number;
  episode?: number;
  title?: string;
  streamUrl: string;
  streamType?: string;
  torrentHash?: string;
  fileIndex?: string;
  progressId?: string;
  audios?: AudioTrackEntry[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  session?: PlaylistItem["session"];
}

const allowedStreamType = (value: string | undefined): PlaylistItem["streamType"] =>
  ALLOWED_STREAM_TYPES.includes(value as (typeof ALLOWED_STREAM_TYPES)[number])
    ? (value as PlaylistItem["streamType"])
    : undefined;

const toPlaylistItem = (raw: ResolvedItemShape, base: PlaybackInfoBase): PlaylistItem => ({
  id: raw.id,
  workId: raw.workId ?? base.workId,
  episodeId: raw.episodeId ?? base.episodeId,
  entryId: raw.entryId ?? base.entryId,
  episodeIds: raw.episodeIds ?? base.episodeIds,
  targets: raw.targets ?? base.targets,
  season: raw.season ?? base.season,
  episode: raw.episode ?? base.episode,
  title: raw.title,
  streamUrl: raw.streamUrl,
  streamType: allowedStreamType(raw.streamType),
  streamHash: raw.torrentHash,
  fileIndex: raw.fileIndex,
  progressId: raw.progressId ?? base.progressId,
  audios: raw.audios?.map((a) => ({ ...a })),
  headers: raw.headers,
  providerId: raw.providerId ?? base.providerId,
  voice: raw.voice,
  session: raw.session,
});

/**
 * Builds an ActivePlayback (R3: playlist-only, no top-level content fields) from a plugin
 * playback-info response. The response carries the resolved content as `playlist[]` items;
 * a legacy top-level `streamUrl` response (pre-playlist plugins) is folded into a single
 * current item — and, when an episode-selector override window exists, patches that window's
 * current index so the queue keeps its identity.
 */
export const buildPlaybackFromInfo = (
  info: PlaybackInfo,
  base: PlaybackInfoBase,
): ActivePlayback => {
  const responseItems: ResolvedItemShape[] = Array.isArray(info.playlist)
    ? (info.playlist as ResolvedItemShape[])
    : [];
  // Legacy shape (torrents et al. still answer with a top-level streamUrl) — read through a
  // narrow cast; the SDK type no longer declares these fields.
  const legacy = info as PlaybackInfo & {
    streamUrl?: string;
    streamType?: string;
    audios?: AudioTrackEntry[];
  };

  let playlist: PlaylistItem[];
  let playlistIndex: number;
  if (responseItems.length > 0) {
    playlist = responseItems.map((item) => toPlaylistItem(item, base));
    playlistIndex = Math.min(Math.max(info.playlistIndex ?? 0, 0), playlist.length - 1);
  } else {
    const resolved = toPlaylistItem({
      streamUrl: legacy.streamUrl ?? "",
      streamType: legacy.streamType,
      audios: legacy.audios,
      headers: info.headers,
      torrentHash: info.torrentHash,
      fileIndex: info.fileIndex,
      session: info.session,
      voice: info.voice,
      progressId: info.progressId,
      providerId: info.providerId,
      title: info.title,
      season: base.season,
      episode: base.episode,
      workId: base.workId,
      episodeId: base.episodeId,
      entryId: base.entryId,
      episodeIds: base.episodeIds,
      targets: base.targets,
    }, base);
    if (base.playlist?.length) {
      playlistIndex = Math.min(Math.max(base.playlistIndex ?? 0, 0), base.playlist.length - 1);
      playlist = base.playlist.map((item, index) =>
        index === playlistIndex
          ? {
              ...item,
              streamUrl: resolved.streamUrl,
              streamType: resolved.streamType ?? item.streamType,
              streamHash: resolved.streamHash ?? item.streamHash,
              fileIndex: resolved.fileIndex ?? item.fileIndex,
              audios: resolved.audios ?? item.audios,
              headers: resolved.headers ?? item.headers,
              session: resolved.session ?? item.session,
              voice: resolved.voice ?? item.voice,
              progressId: resolved.progressId ?? item.progressId,
            }
          : item);
    } else {
      playlist = [resolved];
      playlistIndex = 0;
    }
  }

  return {
    title: info.title || base.title || "",
    originalTitle: base.originalTitle,
    englishTitle: base.englishTitle,
    backdropSrc: base.backdropSrc,
    posterSrc: base.posterSrc,
    stillSrc: base.stillSrc,
    mediaType: base.mediaType,
    id: base.id,
    providerId: base.providerId,
    playlist,
    playlistIndex,
    subtitles: info.subtitles,
    duration: info.duration,
    introStart: info.introStart,
    introEnd: info.introEnd,
    outroStart: info.outroStart,
    outroEnd: info.outroEnd,
    thumbnails: info.thumbnails,
    requiresBuffering: info.requiresBuffering,
    startAt: base.startAt,
    sourceStream: base.sourceStream,
    mount: base.mount,
  };
};

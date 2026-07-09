import type { SDKSubtitleInfo, SDKPlaybackSession, SDKThumbnails } from "../sdk/src/types";

export type ConnectionState = "checking" | "connected" | "offline" | "setupRequired";

export interface PlaylistItem {
  id?: string;
  season: number;
  episode: number;
  title?: string;
  streamUrl: string;
  streamType?: "m3u8" | "mp4" | "hls" | "dash";
  audios?: { name: string; url: string }[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
}

export interface ActivePlayback {
  streamUrl: string;
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  mediaType: "movie" | "tv";
  id: number;
  season?: number;
  episode?: number;
  streamHash?: string;
  fileIndex?: string;
  streamType?: "m3u8" | "mp4" | "hls" | "dash";
  audios?: { name: string; url: string }[];
  audioNames?: string[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  session?: SDKPlaybackSession;
  playlist?: PlaylistItem[];
  playlistIndex?: number;
  subtitles?: SDKSubtitleInfo[];
  duration?: number;
  introStart?: number;
  introEnd?: number;
  outroStart?: number;
  outroEnd?: number;
  thumbnails?: SDKThumbnails;
  requiresBuffering?: boolean;
}
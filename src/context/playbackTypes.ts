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

// Enrichable playback metadata — the ONLY fields patched asynchronously after playback starts
// (via enrichPlayback). Kept in a SEPARATE context atom from ActivePlayback so a late patch never mints
// a new descriptor object and never re-inits the media pipeline (the "teardown on enrich" bug). The same
// fields still live on ActivePlayback as playVideo SEED values (initial open + sessionStorage restore).
export interface PlaybackMeta {
  subtitles?: SDKSubtitleInfo[];
  duration?: number;
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
  // Media artwork, carried through so the co-watch lobby can show a banner for what's being watched.
  backdropSrc?: string;
  posterSrc?: string;
  // Co-watch always starts from 0 (no resume), so host and guests share one timeline from the beginning.
  startAtZero?: boolean;
  // Set for co-watch playbacks. Such a playback is tied to a live SignalR session, so it must NOT be
  // persisted/restored across reloads (the session is gone on reload — restoring would spawn a solo zombie).
  coWatch?: boolean;
  // Monotonic per-playVideo id. Used as the player's React key so every playVideo mounts a fresh player
  // instance (no stale HLS/state carried over); enrichPlayback preserves it so mid-playback patches don't remount.
  instanceId?: number;
}
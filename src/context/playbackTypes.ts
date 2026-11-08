import type {
  SDKPlaybackSession,
  SDKReleaseBindingTarget,
  SDKSubtitleInfo,
  SDKThumbnails,
} from "../sdk/src/types";

export type ConnectionState = "checking" | "connected" | "offline" | "setupRequired";

/**
 * One audio-track / voice-candidate entry. Beyond the playable `{name, url}` pair, online
 * sources attach candidate metadata (plain voice label + provider identity + resolve query) so
 * voice switching can re-resolve through the candidate's OWN provider and resume can restore
 * the full cross-provider menu.
 */
export interface AudioTrackEntry {
  name: string;
  url: string;
  label?: string | null;
  voice?: string | null;
  providerId?: string | null;
  sourceId?: string | null;
  query?: unknown;
}

export interface PlaylistItem {
  id?: string;
  workId?: string | null;
  episodeId?: string | null;
  entryId?: string | null;
  episodeIds?: string[];
  targets?: SDKReleaseBindingTarget[];
  season?: number;
  episode?: number;
  title?: string;
  filler?: import("../network/ArmTypes").ArmEpisodeFiller | null;
  /** The ONLY content link. No streamUrl on an item — no playback for that item. */
  streamUrl: string;
  streamType?: "m3u8" | "mp4" | "hls" | "dash";
  streamHash?: string;
  fileIndex?: string;
  /** Opaque plugin-owned progress identity — used verbatim as the local progress/resume key. */
  progressId?: string;
  audios?: AudioTrackEntry[];
  headers?: Record<string, string>;
  providerId?: string;
  voice?: string;
  session?: SDKPlaybackSession;
}

/** The episode the player works with — strictly through the playlist, never a top-level url. */
export function getCurrentPlaylistItem(playback: ActivePlayback): PlaylistItem | undefined {
  return playback.playlist[playback.playlistIndex];
}

/**
 * Stable per-episode identity (co-watch re-broadcast gating): playlist index + the item's id,
 * falling back to its stream url.
 */
export function currentEpisodeKey(playback: ActivePlayback): string {
  const item = getCurrentPlaylistItem(playback);
  return `${playback.playlistIndex}:${item?.id ?? item?.streamUrl ?? ""}`;
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
  /** Media identity (title-level), not episode content — episodes live in the playlist. */
  title: string;
  originalTitle?: string;
  englishTitle?: string;
  mediaType: "movie" | "tv";
  id: number;
  /** Owning plugin id (sandbox addressing, stop gating, stats) — not a content link. */
  providerId?: string;
  /** The ONLY carrier of episode content: every episode object holds its own stream link and voices. */
  playlist: PlaylistItem[];
  playlistIndex: number;
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
  /** Episode still (TV). Opaque URL the player/progress dump may carry; host does not interpret it. */
  stillSrc?: string;
  // Co-watch always starts from 0 (no resume), so host and guests share one timeline from the beginning.
  startAtZero?: boolean;
  /** Explicit start position in seconds. When set, skips the resume toast and wins over stored resume. */
  startAt?: number;
  /** Opaque source payload a plugin may publish for its own bookkeeping. Host does not interpret it. */
  sourceStream?: unknown;
  // Set for co-watch playbacks. Such a playback is tied to a live SignalR session, so it must NOT be
  // persisted/restored across reloads (the session is gone on reload — restoring would spawn a solo zombie).
  coWatch?: boolean;
  // Monotonic per-playVideo id. Used as the player's React key so every playVideo mounts a fresh player
  // instance (no stale HLS/state carried over); enrichPlayback preserves it so mid-playback patches don't remount.
  instanceId?: number;
  // Who renders this playback: AppLayout lifts an OverlayPlayer for 'overlay' (the default — resume,
  // hero, sessionStorage restore all open fullscreen-style); an inline host (media/plugin/room pages)
  // embeds an InlinePlayer for 'inline' while it stays mounted. The player dies with its host.
  mount?: "inline" | "overlay";
}

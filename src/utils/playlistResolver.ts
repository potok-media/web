import type { PlaybackInfo } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../context/playbackTypes";
import { ExtensionRegistry } from "./extensions/ExtensionRegistry";
import { logger } from "./logger";

/**
 * Host-side registry for playlist item resolvers. Replaces the old mutable
 * window.potok_playlist_resolve / window.__potok_playlist_resolve_owner bridge.
 *
 * Resolvers are keyed by playback.instanceId (minted per playVideo), so a
 * resolver can never leak across playback switches. Producers that register
 * before playVideo mints the id (plugin sandbox PLAY_VIDEO, media-streams
 * episode play) park the resolver as "pending"; the first lookup for the new
 * playback adopts it. The pending slot carries an owner tag so a flow only
 * ever clears its own resolver — same invariant the old global owner tag had.
 */

export type PlaylistResolver = (item: PlaylistItem) => Promise<PlaybackInfo | null | undefined>;

export interface ResolvePlaylistItemOptions {
  /**
   * Session-remembered voice: overrides the item's default voice in the resolve request (the plugin
   * matches by voice name). Passed as an overridden COPY of the item, so the caller's playlist entry
   * and any cached resolver state are never mutated by a voice-specific resolution.
   */
  voiceOverride?: string;
}

const resolvers = new Map<number, PlaylistResolver>();
// instanceIds whose cached resolver was built on the fly by resolvePlaylistItem (see below). Only
// those capture the playlist array by closure, so only those can go stale when the playlist is
// reordered — bridge/plugin-registered resolvers resolve per item and never need a rebuild.
const sandboxResolverIds = new Set<number>();
let pending: { owner: string; resolver: PlaylistResolver } | null = null;

/** Registers a resolver for an already-known playback instanceId. */
export function registerPlaylistResolver(instanceId: number, resolver: PlaylistResolver): void {
  resolvers.set(instanceId, resolver);
}

/**
 * Parks a resolver until the playback it belongs to gets an instanceId.
 * Overwrites any previous pending resolver, mirroring the old global bridge.
 */
export function registerPendingPlaylistResolver(owner: string, resolver: PlaylistResolver): void {
  pending = { owner, resolver };
}

/** Clears a pending resolver only when it was parked by the given owner. */
export function clearPendingPlaylistResolver(owner: string): void {
  if (pending?.owner === owner) pending = null;
}

/** Drops the resolver bound to a playback instance (called on playback close/switch). */
export function clearPlaylistResolver(instanceId: number): void {
  sandboxResolverIds.delete(instanceId);
  resolvers.delete(instanceId);
}

/** Plugin-facing episode reference: every field a resolver may need to re-resolve one playlist item. */
function toEpisodeRef(ep: PlaylistItem) {
  return {
    id: ep.id,
    season: ep.season,
    episode: ep.episode,
    title: ep.title,
    streamUrl: ep.streamUrl,
    headers: ep.headers,
    voice: ep.voice,
    audios: ep.audios,
    workId: ep.workId,
    episodeId: ep.episodeId,
    entryId: ep.entryId,
    episodeIds: ep.episodeIds,
    targets: ep.targets,
    providerId: ep.providerId,
  };
}

function playbackContext(playback: ActivePlayback) {
  return {
    type: playback.mediaType,
    tmdbId: playback.id,
    title: playback.originalTitle || playback.title,
  };
}

/**
 * Builds the plugin-sandbox resolver for a playback descriptor: every next
 * playlist item is resolved by the owning plugin via STREAM_SOURCE_GET_PLAYBACK_INFO.
 * Returns null when the playback lacks the data the plugin needs.
 */
export function createSandboxPlaylistResolver(
  playback: ActivePlayback,
  fallbackPluginId?: string,
): PlaylistResolver | null {
  const playlist = playback.playlist;
  const sourceStream = playback.sourceStream;
  const pluginId =
    typeof playback.providerId === "string" && playback.providerId
      ? playback.providerId
      : fallbackPluginId;
  if (!Array.isArray(playlist) || playlist.length === 0 || !sourceStream || !pluginId) {
    return null;
  }
  const context = playbackContext(playback);
  return (item: PlaylistItem) => {
    const episodes = playlist.map(toEpisodeRef);
    logger.log("[playlistResolver] resolving item via sandbox request", {
      pluginId,
      itemId: item.id,
      season: item.season,
      episode: item.episode,
      episodesCount: episodes.length,
    });
    return ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", {
      stream: sourceStream,
      episode: {
        id: item.id,
        season: item.season,
        episode: item.episode,
        title: item.title,
        url: item.streamUrl,
        providerId: item.providerId,
        voice: item.voice,
        audios: item.audios,
      },
      episodes,
      context,
    });
  };
}

/**
 * Re-resolves the CURRENT episode of the given playback under a different voice by asking the owning
 * plugin directly (same STREAM_SOURCE_GET_PLAYBACK_INFO contract as the playlist resolver, but with
 * episode.voice set to the user-picked voice — online-balancers bake the voice into the resolved
 * stream, so switching voices requires a fresh resolution).
 *
 * Deliberately bypasses the instanceId-keyed resolver cache: cached resolvers forward each item's
 * STORED voice, so routing a voice-specific request through them would poison later per-item
 * resolutions (and a cached result would replay the wrong voice). Returns null when the playback
 * lacks the plugin data (providerId / sourceStream) needed to re-resolve.
 */
export async function resolveEpisodeVoice(
  playback: ActivePlayback,
  voice: string,
): Promise<PlaybackInfo | null> {
  const sourceStream = playback.sourceStream;
  const pluginId =
    typeof playback.providerId === "string" && playback.providerId ? playback.providerId : undefined;
  if (!sourceStream || !pluginId) return null;

  const playlist = playback.playlist;
  const current =
    playlist && playback.playlistIndex !== undefined ? playlist[playback.playlistIndex] : undefined;
  return ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", {
    stream: sourceStream,
    episode: {
      id: current?.id,
      season: current?.season ?? playback.season,
      episode: current?.episode ?? playback.episode,
      title: current?.title ?? playback.title,
      url: current?.streamUrl ?? playback.streamUrl,
      // NEVER playback.providerId here — that field holds the OWNING PLUGIN id (e.g.
      // "potok-online-balancers"), not a provider slug; the plugin reads episode.providerId as
      // the balancer slug and would reject it ("Unknown online provider"). The plugin falls
      // back to sourceStream.providerId, which is the correct slug.
      providerId: current?.providerId,
      voice,
      // The TOP-LEVEL audios list — the exact entries the player's menu renders and the switch
      // request names. Item-level audios may use different labels (long "Voice · Quality ·
      // Provider" forms), which would fail the plugin's voice match.
      audios: playback.audios ?? current?.audios,
    },
    episodes: (playlist ?? []).map(toEpisodeRef),
    context: playbackContext(playback),
  });
}

/**
 * Resolves the stream info for a playlist item of the given playback.
 * Lookup order: resolver registered for playback.instanceId → pending resolver
 * (adopted under the instanceId) → sandbox resolver built on the fly from the
 * playback's providerId + sourceStream. Returns null when nothing can resolve.
 */
export async function resolvePlaylistItem(
  playback: ActivePlayback,
  item: PlaylistItem,
  options?: ResolvePlaylistItemOptions,
): Promise<PlaybackInfo | null | undefined> {
  let resolver: PlaylistResolver | undefined;
  if (playback.instanceId !== undefined) {
    resolver = resolvers.get(playback.instanceId);
  }
  if (!resolver && pending) {
    const adopted = pending;
    pending = null;
    if (playback.instanceId !== undefined) {
      resolvers.set(playback.instanceId, adopted.resolver);
    }
    resolver = adopted.resolver;
  }
  if (!resolver) {
    resolver = createSandboxPlaylistResolver(playback) ?? undefined;
    if (resolver && playback.instanceId !== undefined) {
      resolvers.set(playback.instanceId, resolver);
      sandboxResolverIds.add(playback.instanceId);
    }
  }
  if (!resolver) return undefined;
  // Session-remembered voice (set when the user explicitly switched dubs) wins over the item's
  // default voice — the plugin matches by voice name. The item is copied so the override never
  // mutates the caller's playlist entry (or the resolver's cached view of it).
  const target = options?.voiceOverride ? { ...item, voice: options.voiceOverride } : item;
  return resolver(target);
}

/**
 * Rebuilds the on-the-fly sandbox resolver cached for a playback after its playlist was replaced
 * (queue reorder): the cached closure still captures the pre-reorder playlist array. Resolvers
 * registered by a bridge or plugin resolve the item passed per call and keep their registration.
 */
export function refreshSandboxPlaylistResolver(playback: ActivePlayback): void {
  const instanceId = playback.instanceId;
  if (instanceId === undefined || !sandboxResolverIds.has(instanceId)) return;
  const resolver = createSandboxPlaylistResolver(playback);
  if (resolver) {
    resolvers.set(instanceId, resolver);
  } else {
    sandboxResolverIds.delete(instanceId);
    resolvers.delete(instanceId);
  }
}

// Playlist override: the episode selector publishes a rebuilt playlist here so the
// next playback (plugin sandbox PLAY_VIDEO or media-streams episode play) picks it up.
let playlistOverride: PlaylistItem[] | null = null;

export function setPlaylistOverride(playlist: PlaylistItem[]): void {
  playlistOverride = playlist;
}

/** Peeks at the override without consuming it. */
export function getPlaylistOverride(): PlaylistItem[] | null {
  return playlistOverride;
}

/** Returns the override and clears it — each override is applied to exactly one playback. */
export function consumePlaylistOverride(): PlaylistItem[] | null {
  const current = playlistOverride;
  playlistOverride = null;
  return current;
}

/** Clears the override only while it is still the exact playlist the caller published. */
export function clearPlaylistOverride(playlist: PlaylistItem[]): void {
  if (playlistOverride === playlist) playlistOverride = null;
}

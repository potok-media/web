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

const resolvers = new Map<number, PlaylistResolver>();
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
  resolvers.delete(instanceId);
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
  const context = {
    type: playback.mediaType,
    tmdbId: playback.id,
    title: playback.originalTitle || playback.title,
  };
  return (item: PlaylistItem) => {
    const episodes = playlist.map((ep) => ({
      id: ep.id,
      season: ep.season,
      episode: ep.episode,
      title: ep.title,
      streamUrl: ep.streamUrl,
      headers: ep.headers,
      voice: ep.voice,
      workId: ep.workId,
      episodeId: ep.episodeId,
      entryId: ep.entryId,
      episodeIds: ep.episodeIds,
      targets: ep.targets,
      providerId: ep.providerId,
    }));
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
      },
      episodes,
      context,
    });
  };
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
    }
  }
  if (!resolver) return undefined;
  return resolver(item);
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

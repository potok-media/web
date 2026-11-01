import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { logger } from "../../utils/logger";
import type { PlaybackInfo, PlaybackMetadata, RawStreamPayload } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../../context/playbackTypes";
import type { GenericEpisodeItem } from "../../components/common/episodeSelector/types";
import {
  clearPendingPlaylistResolver,
  consumePlaylistOverride,
  registerPendingPlaylistResolver,
} from "../../utils/playlistResolver";
import type { StreamContext, StreamSource } from "./mediaStreamsTypes";

interface PlaylistBridgeParams {
  ep: GenericEpisodeItem;
  activeSource: StreamSource;
  clickedStream: RawStreamPayload;
  context: StreamContext;
  enrichPlayback: (patch: Partial<ActivePlayback>, keys: { streamHash?: string; fileIndex?: string }) => void;
  episodes?: { id: string; season?: number; episode?: number; title?: string; voice?: string; url?: string }[];
}

/** Marks resolvers installed by this bridge so the else-branch only clears its own. */
const bridgeOwner = "media-streams";

export function setupPlaylistBridge({
  ep,
  activeSource,
  clickedStream,
  context,
  enrichPlayback,
  episodes,
}: PlaylistBridgeParams): {
  playlist: ActivePlayback["playlist"] | undefined;
  playlistIndex: number | undefined;
} {
  const playlist = consumePlaylistOverride() ?? undefined;
  let playlistIndex: number | undefined;

  if (playlist) {
    playlistIndex = playlist.findIndex(
      (item) => item.id && ep.id
        ? String(item.id) === String(ep.id)
        : item.season === ep.season && item.episode === ep.episode,
    );
    if (playlistIndex === -1 || playlistIndex === undefined) playlistIndex = 0;

    const src = activeSource;
    const stream = clickedStream;
    const ctx = context;
    registerPendingPlaylistResolver(bridgeOwner, async (item: PlaylistItem) => {
      const nextEp = {
        id: item.id,
        workId: item.workId,
        episodeId: item.episodeId,
        entryId: item.entryId,
        episodeIds: item.episodeIds,
        targets: item.targets,
        season: item.season,
        episode: item.episode,
        title: item.title,
        url: item.streamUrl,
        providerId: item.providerId,
        audios: [],
      };
      const nextInfo = await ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
        src.pluginId,
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        { stream, episode: nextEp, context: ctx, episodes },
      );

      if (nextInfo) {
        ExtensionRegistry.sendSandboxRequest<PlaybackMetadata>(
          src.pluginId,
          "STREAM_SOURCE_GET_PLAYBACK_METADATA",
          { stream, episode: nextEp, context: ctx },
          15000,
        )
          .then((meta) => {
            if (!meta) return;
            enrichPlayback(
              { subtitles: meta.subtitles, duration: meta.duration },
              { streamHash: nextInfo.torrentHash, fileIndex: nextInfo.fileIndex },
            );
          })
          .catch((err) => {
            logger.error("[useMediaStreams] Background metadata fetch failed:", err);
          });
      }

      return nextInfo;
    });
  } else {
    // Only clear a resolver this bridge installed — never clobber one parked
    // by the plugin sandbox for a plugin-driven playback.
    clearPendingPlaylistResolver(bridgeOwner);
  }

  return { playlist, playlistIndex };
}

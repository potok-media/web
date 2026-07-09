import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { logger } from "../../utils/logger";
import type { PlaybackInfo, PlaybackMetadata, RawStreamPayload } from "@potok/sdk-types";
import type { ActivePlayback, PlaylistItem } from "../../context/playbackTypes";
import type { GenericEpisodeItem } from "../../components/common/episodeSelector/types";
import type { PlaylistResolveBridge, StreamContext, StreamSource } from "./mediaStreamsTypes";

interface PlaylistBridgeParams {
  ep: GenericEpisodeItem;
  activeSource: StreamSource;
  clickedStream: RawStreamPayload;
  context: StreamContext;
  enrichPlayback: (patch: Partial<ActivePlayback>, keys: { streamHash?: string; fileIndex?: string }) => void;
}

export function setupPlaylistBridge({
  ep,
  activeSource,
  clickedStream,
  context,
  enrichPlayback,
}: PlaylistBridgeParams): {
  playlist: ActivePlayback["playlist"] | undefined;
  playlistIndex: number | undefined;
} {
  const bridge = window as PlaylistResolveBridge;
  let playlist = bridge.potok_playlist_override;
  let playlistIndex: number | undefined;

  if (playlist) {
    playlistIndex = playlist.findIndex(
      (item) => item.season === ep.season && item.episode === ep.episode,
    );
    if (playlistIndex === -1 || playlistIndex === undefined) playlistIndex = 0;
    bridge.potok_playlist_override = undefined;

    const src = activeSource;
    const stream = clickedStream;
    const ctx = context;
    bridge.potok_playlist_resolve = async (item: PlaylistItem) => {
      const nextEp = {
        id: item.id,
        season: item.season,
        episode: item.episode,
        title: item.title,
        url: item.streamUrl,
        audios: [],
      };
      const nextInfo = await ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
        src.pluginId,
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        { stream, episode: nextEp, context: ctx },
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
    };
  } else {
    bridge.potok_playlist_resolve = undefined;
  }

  return { playlist, playlistIndex };
}
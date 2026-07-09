import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { PlaybackInfo, PlaybackMetadata, RawStreamPayload } from "@potok/sdk-types";
import type { ActivePlayback } from "../../context/playbackTypes";
import type { StreamContext } from "./mediaStreamsTypes";

export function deferPlaybackMetadata(
  pluginId: string,
  stream: RawStreamPayload,
  episode: unknown,
  info: PlaybackInfo,
  context: StreamContext,
  enrichPlayback: (patch: Partial<ActivePlayback>, keys: { streamHash?: string; fileIndex?: string }) => void,
): void {
  if (!info.torrentHash) return;
  ExtensionRegistry.sendSandboxRequest<PlaybackMetadata>(
    pluginId,
    "STREAM_SOURCE_GET_PLAYBACK_METADATA",
    { stream, episode, context },
  )
    .then((meta) => {
      if (!meta) return;
      const patch: Partial<ActivePlayback> = {};
      if (meta.subtitles) patch.subtitles = meta.subtitles;
      if (typeof meta.duration === "number") patch.duration = meta.duration;
      if (Object.keys(patch).length > 0) {
        enrichPlayback(patch, {
          streamHash: info.torrentHash,
          fileIndex: info.fileIndex,
        });
      }
    })
    .catch(() => {
      /* degraded — player keeps playing */
    });
}
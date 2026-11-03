import React, { useCallback } from "react";
import type { PlaybackInfo, PlaybackMetadata } from "@potok/sdk-types";
import { resumeContinueWatching, type ContinueResumeDeps } from "../utils/continueWatchingResume";
import type { ContinueWatchingCursor } from "../utils/continueWatching";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { usePlayback } from "../context/PlaybackContext";
import { useHUD } from "../context/useHUD";
import type { EpisodesResponse } from "./mediaStreams/mediaStreamsTypes";

/** Resume wiring: sandbox requests go to the cursor's owning plugin, playback into the host player. */
export function useResumeContinueWatching(): {
  resume: (cursor: ContinueWatchingCursor) => Promise<void>;
} {
  const { playVideo, enrichPlayback } = usePlayback();
  const { show: showHUD } = useHUD();

  const deps = React.useMemo<ContinueResumeDeps>(
    () => ({
      requestEpisodes: (providerId, stream, context) =>
        ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(
          providerId,
          "STREAM_SOURCE_GET_EPISODES",
          { stream, context },
        ),
      requestPlaybackInfo: (providerId, args) =>
        ExtensionRegistry.sendSandboxRequest<PlaybackInfo | null>(
          providerId,
          "STREAM_SOURCE_GET_PLAYBACK_INFO",
          args,
        ),
      requestPlaybackMetadata: (providerId, args) =>
        ExtensionRegistry.sendSandboxRequest<PlaybackMetadata | null>(
          providerId,
          "STREAM_SOURCE_GET_PLAYBACK_METADATA",
          args,
          15000,
        ),
      playVideo,
      enrichPlayback,
    }),
    [playVideo, enrichPlayback],
  );

  const resume = useCallback(
    async (cursor: ContinueWatchingCursor) => {
      try {
        await resumeContinueWatching(cursor, deps);
      } catch (err) {
        showHUD("error", err instanceof Error ? err.message : String(err));
      }
    },
    [deps, showHUD],
  );

  return { resume };
}

import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { PlaybackInfo, PlaybackMetadata } from "@potok/sdk-types";
import {
  resumeContinueWatching,
  ResumePluginUnavailableError,
  type ContinueResumeDeps,
} from "../utils/continueWatchingResume";
import type { ContinueWatchingCursor } from "../utils/continueWatching";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { getPluginAvailability } from "../utils/extensions/pluginAvailability";
import { usePlayback } from "../context/PlaybackContext";
import { useHUD } from "../context/useHUD";
import type { EpisodesResponse } from "./mediaStreams/mediaStreamsTypes";

/** Resume wiring: sandbox requests go to the cursor's owning plugin, playback into the host player. */
export function useResumeContinueWatching(): {
  /** Resolves true when playback was opened; errors are surfaced as HUD notifications and resolve false. */
  resume: (cursor: ContinueWatchingCursor) => Promise<boolean>;
} {
  const { playVideo, enrichPlayback } = usePlayback();
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("profile");

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
      checkPluginAvailability: getPluginAvailability,
      playVideo,
      enrichPlayback,
    }),
    [playVideo, enrichPlayback],
  );

  const resume = useCallback(
    async (cursor: ContinueWatchingCursor): Promise<boolean> => {
      try {
        await resumeContinueWatching(cursor, deps);
        return true;
      } catch (err) {
        if (err instanceof ResumePluginUnavailableError) {
          showHUD("warning", t("hud.sourceUnavailable", { name: err.providerId }));
          return false;
        }
        // Narrow fallback for an inconclusive registry lookup: a dead plugin surfaces as a
        // sandbox-level failure — report it as a source-unavailable notification too.
        if (err instanceof Error && err.message.startsWith("Plugin sandbox not active:")) {
          const providerId = err.message.split(":").pop()?.trim() || cursor.providerId;
          showHUD("warning", t("hud.sourceUnavailable", { name: providerId }));
          return false;
        }
        showHUD("error", err instanceof Error ? err.message : String(err));
        return false;
      }
    },
    [deps, showHUD, t],
  );

  return { resume };
}

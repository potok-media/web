import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  formatProgressLabel,
  useContinueWatchingCursors,
  type ContinueWatchingCursor,
} from "../utils/continueWatching";
import { resumeContinueWatching, type ContinueResumeDeps } from "../utils/continueWatchingResume";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import { usePlayback } from "../context/PlaybackContext";
import { useHUD } from "../context/useHUD";
import type { MediaCard } from "../network/ApiTypes";
import type { EpisodesResponse } from "../hooks/mediaStreams/mediaStreamsTypes";
import type { PlaybackInfo, PlaybackMetadata } from "@potok/sdk-types";
import { MediaCardComponent } from "./MediaCardComponent";
import { ScrollView } from "./common/ScrollView";
import { mediaCardKey } from "../utils/mediaLink";

/** Resume wiring: sandbox requests go to the cursor's owning plugin, playback into the host player. */
function useResumeContinueWatching(): {
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

function cursorToMediaCard(cursor: ContinueWatchingCursor): MediaCard {
  const percentage = cursor.durationSeconds > 0
    ? Math.min(100, Math.round((cursor.progressSeconds / cursor.durationSeconds) * 100))
    : 0;
  return {
    id: cursor.tmdbId ?? 0,
    potokId: cursor.workId,
    entryId: cursor.entryId,
    title: cursor.title,
    mediaType: cursor.mediaType,
    posterSrc: cursor.posterSrc,
    subtitle: formatProgressLabel(cursor.progressSeconds, cursor.durationSeconds),
    progress: {
      completed: 0,
      aired: 0,
      percentage,
      lastSeason: cursor.season,
      lastEpisode: cursor.episode,
    },
  };
}

/**
 * Native host "Continue watching" home row — the cross-source ledger rendered with the standard
 * media cards (episode pill + watch-progress bar). Renders nothing while the ledger is empty.
 */
export const ContinueWatchingRow: React.FC = () => {
  const { t } = useTranslation("media");
  const cursors = useContinueWatchingCursors();
  const { resume } = useResumeContinueWatching();

  const entries = useMemo(
    () => cursors.map((cursor) => ({ cursor, card: cursorToMediaCard(cursor) })),
    [cursors],
  );

  const handleCardClick = useCallback(
    (item: MediaCard) => {
      const entry = entries.find((e) => e.card === item);
      if (!entry) return;
      void resume(entry.cursor);
    },
    [entries, resume],
  );

  if (!entries.length) return null;

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <h2 className="carousel-title">{t("home.continueWatching")}</h2>
      </div>
      <ScrollView
        orientation="horizontal"
        className="carousel-viewport"
        renderTrack={({ trackProps }) => (
          <div className={`carousel-row ${trackProps.className}`}>
            {entries.map(({ card }) => (
              <MediaCardComponent
                key={mediaCardKey(card)}
                item={card}
                onClick={handleCardClick}
                showContinueOverlay
              />
            ))}
          </div>
        )}
      />
    </div>
  );
};

export default ContinueWatchingRow;

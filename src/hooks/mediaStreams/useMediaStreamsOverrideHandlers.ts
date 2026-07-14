import { useCallback } from "react";
import type { RawStreamPayload } from "@potok/sdk-types";
import { clearFileOverride, clearSeasonOverride, saveFileOverride, saveSeasonOverride } from "./mediaStreamsOverride";
import type { EpisodesResponse, StreamContext, StreamSource } from "./mediaStreamsTypes";

interface UseMediaStreamsOverrideHandlersParams {
  activeSource: StreamSource | undefined;
  clickedStream: RawStreamPayload | null;
  context: StreamContext;
  setIsSaving: (saving: boolean) => void;
  refreshEpisodes: (res: EpisodesResponse) => void;
  onError: (err: unknown) => void;
}

export function useMediaStreamsOverrideHandlers({
  activeSource,
  clickedStream,
  context,
  setIsSaving,
  refreshEpisodes,
  onError,
}: UseMediaStreamsOverrideHandlersParams) {
  const runOverride = useCallback(
    (runner: () => Promise<EpisodesResponse>) => {
      if (!activeSource || !clickedStream) return;
      setIsSaving(true);
      runner()
        .then(refreshEpisodes)
        .catch(onError)
        .finally(() => setIsSaving(false));
    },
    [activeSource, clickedStream, onError, refreshEpisodes, setIsSaving],
  );

  const handleApplyOverride = useCallback(
    (sourceSeason: number | null, targetSeason: number, offset: number) => {
      if (!activeSource || !clickedStream) return;
      runOverride(() =>
        saveSeasonOverride(activeSource, clickedStream, context, sourceSeason, targetSeason, offset),
      );
    },
    [activeSource, clickedStream, context, runOverride],
  );

  const handleResetOverride = useCallback(
    (sourceSeason: number | null) => {
      if (!activeSource || !clickedStream) return;
      runOverride(() => clearSeasonOverride(activeSource, clickedStream, context, sourceSeason));
    },
    [activeSource, clickedStream, context, runOverride],
  );

  const handleApplyFileOverride = useCallback(
    (fileId: string, season: number, episode: number, mode: "anchor" | "pin") => {
      if (!activeSource || !clickedStream) return;
      runOverride(() =>
        saveFileOverride(activeSource, clickedStream, context, fileId, season, episode, mode),
      );
    },
    [activeSource, clickedStream, context, runOverride],
  );

  const handleResetFileOverride = useCallback(
    (fileId: string) => {
      if (!activeSource || !clickedStream) return;
      runOverride(() => clearFileOverride(activeSource, clickedStream, context, fileId));
    },
    [activeSource, clickedStream, context, runOverride],
  );

  return { handleApplyOverride, handleResetOverride, handleApplyFileOverride, handleResetFileOverride };
}
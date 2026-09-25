import { useCallback, useEffect, useRef } from "react";
import type { RawStreamPayload, SDKEpisodeBindingOverride } from "@potok/sdk-types";
import { clearFileOverride, clearSeasonOverride, saveEpisodeBinding, saveFileOverride, saveSeasonOverride } from "./mediaStreamsOverride";
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
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setIsSaving(false);
    return () => {
      // Request generations must change on cleanup to discard late saves for a closed release.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [activeSource?.pluginId, clickedStream, context, setIsSaving]);

  const runOverride = useCallback(
    (runner: () => Promise<EpisodesResponse>) => {
      if (!activeSource || !clickedStream) return;
      const requestGeneration = generation.current;
      setIsSaving(true);
      runner()
        .then((response) => { if (requestGeneration === generation.current) refreshEpisodes(response); })
        .catch((error) => { if (requestGeneration === generation.current) onError(error); })
        .finally(() => { if (requestGeneration === generation.current) setIsSaving(false); });
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

  const handleApplyEpisodeBinding = useCallback(
    (override: SDKEpisodeBindingOverride) => {
      if (!activeSource?.capabilities?.episodeBinding || !clickedStream) return;
      runOverride(() => saveEpisodeBinding(activeSource, clickedStream, context, override));
    },
    [activeSource, clickedStream, context, runOverride],
  );

  return { handleApplyOverride, handleResetOverride, handleApplyFileOverride, handleResetFileOverride, handleApplyEpisodeBinding };
}

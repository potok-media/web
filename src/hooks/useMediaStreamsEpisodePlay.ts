import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../context/PlaybackContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { MediaCard } from "../network/ApiTypes";
import type { ActivePlayback } from "../context/playbackTypes";
import type { PlaybackInfo, RawStreamPayload, StreamEpisode, SDKReleaseBindingTarget } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import type { ArmEpisodeLayoutResponse } from "../network/ArmTypes";
import { buildPlaybackFromInfo } from "../utils/mediaStreamsPlayback";
import {
  buildEpisodeSelectorData,
  type EpisodesResponse,
  type StreamContext,
  type StreamSource,
} from "./mediaStreams/mediaStreamsTypes";
import { deferPlaybackMetadata } from "./mediaStreams/mediaStreamsMetadata";
import { setupPlaylistBridge } from "./mediaStreams/mediaStreamsPlaylistBridge";
import { useMediaStreamsOverrideHandlers } from "./mediaStreams/useMediaStreamsOverrideHandlers";
import { loadArmBindingLayout } from "./mediaStreams/armBindingLayout";
import {
  initialReleasePlaybackState,
  releasePlaybackModeFor,
  releasePlaybackReducer,
  validateReleasePlayback,
} from "./mediaStreams/releasePlaybackFlow";

interface UseMediaStreamsEpisodePlayParams {
  mediaType?: string;
  mediaId: number;
  currentMedia: MediaCard | null;
  activeSource: StreamSource | undefined;
  context: StreamContext;
  mapEpisodesWithWatched: (eps: StreamEpisode[]) => GenericEpisodeItem[];
  onError: (err: unknown) => void;
}

export function useMediaStreamsEpisodePlay(params: UseMediaStreamsEpisodePlayParams) {
  const { mediaType, mediaId, currentMedia, activeSource, context, mapEpisodesWithWatched, onError } = params;
  const { i18n } = useTranslation();
  const { activePlayback, playVideo, enrichPlayback, stopVideo } = usePlayback();

  const [flow, dispatchFlow] = useReducer(releasePlaybackReducer, initialReleasePlaybackState);
  const clickedStream = flow.release;
  const episodeSelectorData = flow.selectorData;
  const [seasons, setSeasons] = useState<Record<string, unknown>[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [armLayout, setArmLayout] = useState<ArmEpisodeLayoutResponse | null>(null);
  const [armLayoutLoading, setArmLayoutLoading] = useState(false);
  const [armLayoutError, setArmLayoutError] = useState(false);
  const editRequest = useRef<AbortController | null>(null);
  const selectionGeneration = useRef(0);
  const previousActivePlayback = useRef(activePlayback);

  useEffect(() => {
    selectionGeneration.current++;
    editRequest.current?.abort();
    dispatchFlow({ type: "reset" });
    setSeasons([]);
    setArmLayout(null);
    setArmLayoutLoading(false);
    setArmLayoutError(false);
    return () => {
      // This is a request-generation counter, intentionally invalidated at cleanup time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      selectionGeneration.current++;
      editRequest.current?.abort();
    };
  }, [mediaId, mediaType, activeSource?.pluginId, context.workId, context.entryId, context.episodeId]);

  useEffect(() => {
    if (previousActivePlayback.current && !activePlayback) {
      dispatchFlow({ type: "player-closed" });
    }
    previousActivePlayback.current = activePlayback;
  }, [activePlayback]);

  const selectorLabels = useMemo(
    () => ({
      fileSelection: i18n.t("media:streams.fileSelection"),
      episodeSelection: i18n.t("media:streams.episodeSelection"),
    }),
    [i18n],
  );

  const playbackLabels = useMemo(
    () => ({
      title: currentMedia?.title || "",
      originalTitle: currentMedia?.originalTitle || currentMedia?.title || "",
      englishTitle: currentMedia?.englishTitle || "",
      backdropSrc: currentMedia?.backdropSrc,
      posterSrc: currentMedia?.posterSrc,
    }),
    [currentMedia],
  );

  const handleClosePopup = useCallback(() => {
    selectionGeneration.current++;
    editRequest.current?.abort();
    // Closing the panel kills the player regardless of the release-flow phase (R1: a playback alive
    // in ready/preparing — or arriving from resume/playlist-next — used to survive, outlive the
    // workspace and pop up as a fullscreen overlay). No playback, no-op.
    if (activePlayback) stopVideo();
    dispatchFlow({ type: "reset" });
    setArmLayout(null);
    setArmLayoutLoading(false);
    setArmLayoutError(false);
    sessionStorage.removeItem("potok_popup_stream");
    sessionStorage.removeItem("potok_popup_data");
  }, [activePlayback, stopVideo]);

  const persistSelectorData = useCallback(
    (stream: RawStreamPayload, res: EpisodesResponse) => {
      const data = buildEpisodeSelectorData(
        stream.title,
        mediaType,
        res.episodes || [],
        res.tmdbSeasonsCount,
        res.seasonMap,
        currentMedia,
        mapEpisodesWithWatched,
        selectorLabels,
        res.parsingSuspect,
        res.fileMap,
        res.arm,
      );
      sessionStorage.setItem("potok_popup_stream", JSON.stringify(stream));
      sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
      const validation = validateReleasePlayback({
        mediaType,
        selectorData: data,
        canonicalBindingEnabled: Boolean(activeSource?.capabilities?.episodeBinding),
      });
      dispatchFlow({ type: "inspection-completed", selectorData: data, validation });
    },
    [mediaType, currentMedia, mapEpisodesWithWatched, selectorLabels, activeSource?.capabilities?.episodeBinding],
  );

  const playFromInfo = useCallback(
    (info: PlaybackInfo, extras: {
      season?: number;
      episode?: number;
      workId?: string | null;
      episodeId?: string | null;
      entryId?: string | null;
      episodeIds?: string[];
      targets?: SDKReleaseBindingTarget[];
      progressId?: string;
      playlist?: ActivePlayback["playlist"];
      playlistIndex?: number;
      sourceStream?: unknown;
      stillSrc?: string;
    }) => {
      playVideo(
        buildPlaybackFromInfo(info, {
          mediaType: mediaType as "movie" | "tv",
          id: mediaId,
          providerId: activeSource?.pluginId,
          // This page hosts the player inline in its stage — the descriptor must say so, otherwise
          // AppLayout would lift it as a fullscreen overlay.
          mount: "inline" as const,
          ...playbackLabels,
          ...extras,
        }),
      );
    },
    [mediaType, mediaId, playbackLabels, playVideo, activeSource?.pluginId],
  );

  const handleSelectStream = useCallback(
    (stream: RawStreamPayload) => {
      if (!activeSource) return;
      const generation = ++selectionGeneration.current;
      const playbackMode = releasePlaybackModeFor(mediaType, stream);
      const directPlayback = playbackMode === "direct";
      editRequest.current?.abort();
      setArmLayout(null);
      setArmLayoutError(false);
      setArmLayoutLoading(false);
      dispatchFlow({
        type: "release-selected",
        release: stream,
        mode: playbackMode,
      });

      if (directPlayback) {
        dispatchFlow({ type: "playback-requested" });
        ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, context })
          .then((info) => {
            if (generation !== selectionGeneration.current) return;
            if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
            playFromInfo(info, { sourceStream: stream });
            dispatchFlow({ type: "playback-started" });
          })
          .catch((error) => {
            if (generation !== selectionGeneration.current) return;
            dispatchFlow({ type: "request-failed", error: error instanceof Error ? error.message : String(error) });
            onError(error);
          });
        return;
      }

      sessionStorage.removeItem("potok_popup_stream");
      sessionStorage.removeItem("potok_popup_data");

      ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream, context })
        .then((res) => {
          if (generation !== selectionGeneration.current) return;
          persistSelectorData(stream, res);
        })
        .catch((error) => {
          if (generation !== selectionGeneration.current) return;
          dispatchFlow({ type: "request-failed", error: error instanceof Error ? error.message : String(error) });
          onError(error);
        });
    },
    [activeSource, mediaType, context, playFromInfo, onError, persistSelectorData, i18n],
  );

  const handlePlayEpisode = useCallback(
    (ep: GenericEpisodeItem) => {
      if (!activeSource || !clickedStream || flow.validation.blocked) return;
      const generation = selectionGeneration.current;
      dispatchFlow({ type: "playback-requested", episodeId: ep.id });

      ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
        activeSource.pluginId,
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        { stream: clickedStream, episode: ep, context, episodes: episodeSelectorData?.episodes, activeEpisodeId: ep.id },
      )
        .then((info) => {
          if (generation !== selectionGeneration.current) return;
          const { playlist, playlistIndex } = setupPlaylistBridge({
            ep,
            activeSource,
            clickedStream,
            context,
            enrichPlayback,
            episodes: episodeSelectorData?.episodes,
          });
          if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
          playFromInfo(info, {
            season: mediaType === "tv" ? ep.season : undefined,
            episode: mediaType === "tv" ? ep.episode : undefined,
            workId: ep.workId,
            episodeId: ep.episodeId,
            entryId: ep.entryId,
            episodeIds: ep.episodeIds,
            targets: ep.targets,
            progressId: ep.progressId,
            playlist,
            playlistIndex,
            sourceStream: clickedStream,
            stillSrc: ep.stillPath,
          });
          deferPlaybackMetadata(activeSource.pluginId, clickedStream, ep, info, context, enrichPlayback);
          dispatchFlow({ type: "playback-started" });
        })
        .catch((error) => {
          if (generation !== selectionGeneration.current) return;
          dispatchFlow({ type: "request-failed", error: error instanceof Error ? error.message : String(error) });
          onError(error);
        });
    },
    [activeSource, clickedStream, context, playFromInfo, onError, mediaType, enrichPlayback, i18n, flow.validation.blocked, episodeSelectorData],
  );

  const handleStartEditing = useCallback(() => {
    if (!activeSource || !clickedStream) return;
    editRequest.current?.abort();
    const controller = new AbortController();
    editRequest.current = controller;
    if (activeSource.capabilities?.episodeBinding) {
      setArmLayout(null);
      setArmLayoutError(false);
      setArmLayoutLoading(true);
      void loadArmBindingLayout({
        ...context,
        workId: episodeSelectorData?.arm?.workId || context.workId,
      }, {
        resolveWork: (reference, options) => ApiClient.resolveArmWork(reference, options),
        getEpisodeLayout: (workId, options) => ApiClient.fetchArmEpisodeLayout(workId, options),
        getEntries: (workId, options) => ApiClient.getArmEntries(workId, options),
        getEpisodes: (workId, options) => ApiClient.getArmEpisodes(workId, options),
      }, i18n.language, controller.signal)
        .then((layout) => { if (!controller.signal.aborted) setArmLayout(layout); })
        .catch(() => { if (!controller.signal.aborted) setArmLayoutError(true); })
        .finally(() => { if (!controller.signal.aborted) setArmLayoutLoading(false); });
      return;
    }
    setSeasons([]);
    setSeasonsLoading(true);
    ExtensionRegistry.sendSandboxRequest<Record<string, unknown>[]>(
      activeSource.pluginId,
      "STREAM_SOURCE_GET_SEASONS",
      { stream: clickedStream, context },
    )
      .then((result) => { if (!controller.signal.aborted) setSeasons(result); })
      .catch((error) => { if (!controller.signal.aborted) onError(error); })
      .finally(() => { if (!controller.signal.aborted) setSeasonsLoading(false); });
  }, [activeSource, clickedStream, context, onError, episodeSelectorData?.arm, i18n.language]);

  const refreshEpisodes = useCallback(
    (res: EpisodesResponse) => {
      if (!clickedStream) return;
      const data = buildEpisodeSelectorData(
        clickedStream.title,
        mediaType,
        res.episodes || [],
        res.tmdbSeasonsCount,
        res.seasonMap,
        currentMedia,
        mapEpisodesWithWatched,
        selectorLabels,
        res.parsingSuspect,
        res.fileMap,
        res.arm,
      );
      sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
      const validation = validateReleasePlayback({
        mediaType,
        selectorData: data,
        canonicalBindingEnabled: Boolean(activeSource?.capabilities?.episodeBinding),
      });
      dispatchFlow({ type: "inspection-completed", selectorData: data, validation });
    },
    [clickedStream, currentMedia, mediaType, mapEpisodesWithWatched, selectorLabels, activeSource?.capabilities?.episodeBinding],
  );

  const { handleApplyOverride, handleResetOverride, handleApplyFileOverride, handleResetFileOverride, handleApplyEpisodeBinding } =
    useMediaStreamsOverrideHandlers({
      activeSource,
      clickedStream,
      context,
      setIsSaving,
      refreshEpisodes,
      onError,
    });

  return {
    clickedStream,
    episodeSelectorData,
    releasePlaybackPhase: flow.phase,
    releasePlaybackMode: flow.mode,
    releasePlaybackError: flow.error,
    playbackBlocked: flow.validation.blocked,
    seasons,
    seasonsLoading,
    armLayout,
    armLayoutLoading,
    armLayoutError,
    isSaving,
    handleClosePopup,
    handleSelectStream,
    handlePlayEpisode,
    handleStartEditing,
    handleApplyOverride,
    handleResetOverride,
    handleApplyFileOverride,
    handleResetFileOverride,
    handleApplyEpisodeBinding: activeSource?.capabilities?.episodeBinding ? handleApplyEpisodeBinding : undefined,
    fileOverrideEnabled: !!activeSource?.capabilities?.fileOverride,
  };
}

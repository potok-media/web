import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../context/PlaybackContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { MediaCard } from "../network/ApiTypes";
import type { ActivePlayback } from "../context/playbackTypes";
import type { PlaybackInfo, RawStreamPayload, StreamEpisode, SDKReleaseBindingTarget } from "@potok/sdk-types";
import { ApiClient } from "../network/ApiClient";
import type { ArmEpisodeLayoutResponse } from "../network/ArmTypes";
import { buildPlaybackFromInfo, mapStreamEpisode } from "../utils/mediaStreamsPlayback";
import {
  buildEpisodeSelectorData,
  type EpisodeSelectorData,
  type EpisodesResponse,
  type StreamContext,
  type StreamSource,
} from "./mediaStreams/mediaStreamsTypes";
import { deferPlaybackMetadata } from "./mediaStreams/mediaStreamsMetadata";
import { setupPlaylistBridge } from "./mediaStreams/mediaStreamsPlaylistBridge";
import { useMediaStreamsOverrideHandlers } from "./mediaStreams/useMediaStreamsOverrideHandlers";
import { loadArmBindingLayout } from "./mediaStreams/armBindingLayout";

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
  const { playVideo, enrichPlayback } = usePlayback();

  const [clickedStream, setClickedStream] = useState<RawStreamPayload | null>(null);
  const [episodeSelectorData, setEpisodeSelectorData] = useState<EpisodeSelectorData | null>(null);
  const [seasons, setSeasons] = useState<Record<string, unknown>[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [armLayout, setArmLayout] = useState<ArmEpisodeLayoutResponse | null>(null);
  const [armLayoutLoading, setArmLayoutLoading] = useState(false);
  const [armLayoutError, setArmLayoutError] = useState(false);
  const editRequest = useRef<AbortController | null>(null);
  const selectionGeneration = useRef(0);

  useEffect(() => {
    selectionGeneration.current++;
    editRequest.current?.abort();
    setClickedStream(null);
    setEpisodeSelectorData(null);
    setSeasons([]);
    setArmLayout(null);
    setArmLayoutLoading(false);
    setArmLayoutError(false);
    setActionLoading(false);
    return () => {
      // This is a request-generation counter, intentionally invalidated at cleanup time.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      selectionGeneration.current++;
      editRequest.current?.abort();
    };
  }, [mediaId, mediaType, activeSource?.pluginId, context.workId, context.orderingId, context.groupId, context.episodeId]);

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
    setEpisodeSelectorData(null);
    setClickedStream(null);
    setArmLayout(null);
    setArmLayoutLoading(false);
    setArmLayoutError(false);
    setActionLoading(false);
    sessionStorage.removeItem("potok_popup_stream");
    sessionStorage.removeItem("potok_popup_data");
  }, []);

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
      setClickedStream(stream);
      setEpisodeSelectorData(data);
    },
    [mediaType, currentMedia, mapEpisodesWithWatched, selectorLabels],
  );

  const playFromInfo = useCallback(
    (info: PlaybackInfo, extras: {
      season?: number;
      episode?: number;
      workId?: string | null;
      episodeId?: string | null;
      orderingId?: string | null;
      groupId?: string | null;
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
      editRequest.current?.abort();
      setArmLayout(null);
      setArmLayoutError(false);
      setArmLayoutLoading(false);
      setActionLoading(true);

      if (mediaType === "movie" && stream.kind !== "torrent") {
        ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, context })
          .then((info) => {
            if (generation !== selectionGeneration.current) return;
            if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
            playFromInfo(info, { sourceStream: stream });
          })
          .catch((error) => { if (generation === selectionGeneration.current) onError(error); })
          .finally(() => { if (generation === selectionGeneration.current) setActionLoading(false); });
        return;
      }

      ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream, context })
        .then(async (res) => {
          if (generation !== selectionGeneration.current) return;
          const eps = res.episodes || [];
          // Canonical TV files remain editable even when a release contains only one file.
          if (eps.length === 1 && !(mediaType === "tv" && activeSource.capabilities?.episodeBinding)) {
            const singleEp = mapStreamEpisode(eps[0]);
            const info = await ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
              activeSource.pluginId,
              "STREAM_SOURCE_GET_PLAYBACK_INFO",
              { stream, episode: singleEp, context },
            );
            if (generation !== selectionGeneration.current) return;
            if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
            playFromInfo(info, {
              season: mediaType === "tv" ? singleEp.season : undefined,
              episode: mediaType === "tv" ? singleEp.episode : undefined,
              workId: singleEp.workId,
              episodeId: singleEp.episodeId,
              orderingId: singleEp.orderingId,
              groupId: singleEp.groupId,
              episodeIds: singleEp.episodeIds,
              targets: singleEp.targets,
              progressId: singleEp.progressId,
              sourceStream: stream,
              stillSrc: singleEp.stillPath,
            });
            deferPlaybackMetadata(activeSource.pluginId, stream, singleEp, info, context, enrichPlayback);
            setClickedStream(null);
            return;
          }
          persistSelectorData(stream, res);
        })
        .catch((error) => { if (generation === selectionGeneration.current) onError(error); })
        .finally(() => { if (generation === selectionGeneration.current) setActionLoading(false); });
    },
    [activeSource, mediaType, context, playFromInfo, onError, persistSelectorData, enrichPlayback, i18n],
  );

  const handlePlayEpisode = useCallback(
    (ep: GenericEpisodeItem) => {
      if (!activeSource || !clickedStream) return;
      const generation = selectionGeneration.current;
      setActionLoading(true);

      ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
        activeSource.pluginId,
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        { stream: clickedStream, episode: ep, context },
      )
        .then((info) => {
          if (generation !== selectionGeneration.current) return;
          const { playlist, playlistIndex } = setupPlaylistBridge({
            ep,
            activeSource,
            clickedStream,
            context,
            enrichPlayback,
          });
          if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
          playFromInfo(info, {
            season: mediaType === "tv" ? ep.season : undefined,
            episode: mediaType === "tv" ? ep.episode : undefined,
            workId: ep.workId,
            episodeId: ep.episodeId,
            orderingId: ep.orderingId,
            groupId: ep.groupId,
            episodeIds: ep.episodeIds,
            targets: ep.targets,
            progressId: ep.progressId,
            playlist,
            playlistIndex,
            sourceStream: clickedStream,
            stillSrc: ep.stillPath,
          });
          deferPlaybackMetadata(activeSource.pluginId, clickedStream, ep, info, context, enrichPlayback);
        })
        .catch((error) => { if (generation === selectionGeneration.current) onError(error); })
        .finally(() => { if (generation === selectionGeneration.current) setActionLoading(false); });
    },
    [activeSource, clickedStream, context, playFromInfo, onError, mediaType, enrichPlayback, i18n],
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
        orderingId: episodeSelectorData?.arm?.orderingId || context.orderingId,
      }, {
        resolveWork: (reference, options) => ApiClient.resolveArmWork(reference, options),
        getEpisodeLayout: (workId, options) => ApiClient.fetchArmEpisodeLayout(workId, options),
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
      setEpisodeSelectorData(data);
    },
    [clickedStream, currentMedia, mediaType, mapEpisodesWithWatched, selectorLabels],
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
    setClickedStream,
    episodeSelectorData,
    setEpisodeSelectorData,
    seasons,
    seasonsLoading,
    armLayout,
    armLayoutLoading,
    armLayoutError,
    isSaving,
    actionLoading,
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

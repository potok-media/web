import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayback } from "../context/PlaybackContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { MediaCard } from "../network/ApiTypes";
import type { ActivePlayback } from "../context/playbackTypes";
import type { PlaybackInfo, RawStreamPayload, StreamEpisode } from "@potok/sdk-types";
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
    }),
    [currentMedia],
  );

  const handleClosePopup = useCallback(() => {
    setEpisodeSelectorData(null);
    setClickedStream(null);
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
      playlist?: ActivePlayback["playlist"];
      playlistIndex?: number;
    }) => {
      playVideo(
        buildPlaybackFromInfo(info, {
          mediaType: mediaType as "movie" | "tv",
          id: mediaId,
          ...playbackLabels,
          ...extras,
        }),
      );
    },
    [mediaType, mediaId, playbackLabels, playVideo],
  );

  const handleSelectStream = useCallback(
    (stream: RawStreamPayload) => {
      if (!activeSource) return;
      setActionLoading(true);

      if (mediaType === "movie" && stream.kind !== "torrent") {
        ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, context })
          .then((info) => {
            if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
            playFromInfo(info, {});
          })
          .catch(onError)
          .finally(() => setActionLoading(false));
        return;
      }

      ExtensionRegistry.sendSandboxRequest<EpisodesResponse>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream, context })
        .then(async (res) => {
          const eps = res.episodes || [];
          if (eps.length === 1) {
            const singleEp = mapStreamEpisode(eps[0]);
            const info = await ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
              activeSource.pluginId,
              "STREAM_SOURCE_GET_PLAYBACK_INFO",
              { stream, episode: singleEp, context },
            );
            if (!info) throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
            playFromInfo(info, {
              season: mediaType === "tv" ? singleEp.season : undefined,
              episode: mediaType === "tv" ? singleEp.episode : undefined,
            });
            deferPlaybackMetadata(activeSource.pluginId, stream, singleEp, info, context, enrichPlayback);
            setClickedStream(null);
            return;
          }
          persistSelectorData(stream, res);
        })
        .catch(onError)
        .finally(() => setActionLoading(false));
    },
    [activeSource, mediaType, context, playFromInfo, onError, persistSelectorData, enrichPlayback, i18n],
  );

  const handlePlayEpisode = useCallback(
    (ep: GenericEpisodeItem) => {
      if (!activeSource || !clickedStream) return;
      setActionLoading(true);

      ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(
        activeSource.pluginId,
        "STREAM_SOURCE_GET_PLAYBACK_INFO",
        { stream: clickedStream, episode: ep, context },
      )
        .then((info) => {
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
            playlist,
            playlistIndex,
          });
          deferPlaybackMetadata(activeSource.pluginId, clickedStream, ep, info, context, enrichPlayback);
        })
        .catch(onError)
        .finally(() => setActionLoading(false));
    },
    [activeSource, clickedStream, context, playFromInfo, onError, mediaType, enrichPlayback, i18n],
  );

  const handleStartEditing = useCallback(() => {
    if (!activeSource || !clickedStream) return;
    setSeasonsLoading(true);
    ExtensionRegistry.sendSandboxRequest<Record<string, unknown>[]>(
      activeSource.pluginId,
      "STREAM_SOURCE_GET_SEASONS",
      { stream: clickedStream, context },
    )
      .then(setSeasons)
      .catch(onError)
      .finally(() => setSeasonsLoading(false));
  }, [activeSource, clickedStream, context, onError]);

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
      );
      sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
      setEpisodeSelectorData(data);
    },
    [clickedStream, currentMedia, mediaType, mapEpisodesWithWatched, selectorLabels],
  );

  const { handleApplyOverride, handleResetOverride } = useMediaStreamsOverrideHandlers({
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
    isSaving,
    actionLoading,
    handleClosePopup,
    handleSelectStream,
    handlePlayEpisode,
    handleStartEditing,
    handleApplyOverride,
    handleResetOverride,
  };
}
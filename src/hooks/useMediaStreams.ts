import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useHUD } from "../context/HUDContext";
import { usePlayback } from "../context/AppSettingsContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../components/common/EpisodeSelectorPopup";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import type { RawStreamPayload, StreamEpisode, PlaybackInfo } from "../network/SDKTypes";
import { logger } from "../utils/logger";

const mapEpisode = (ep: StreamEpisode): GenericEpisodeItem => ({
  id: ep.id, season: ep.season, episode: ep.episode, title: ep.title,
  stillPath: ep.stillPath, airDate: ep.airDate,
  audios: ep.audios || [], url: ep.url,
});

interface UseMediaStreamsParams {
  mediaType?: string;
  mediaId: number;
  season?: number;
  episode?: number;
  initialMedia?: MediaCard;
  activeTab?: string;
}

export function useMediaStreams({ mediaType, mediaId, season, episode, initialMedia, activeTab: activeTabParam }: UseMediaStreamsParams) {
  const { show: showHUD } = useHUD();
  const { playVideo } = usePlayback();

  const [clickedStream, setClickedStream] = useState<RawStreamPayload | null>(null);
  const [episodeSelectorData, setEpisodeSelectorData] = useState<{
    title: string; episodes: GenericEpisodeItem[]; tmdbSeasonsCount: number;
  } | null>(null);

  const [seasons, setSeasons] = useState<Record<string, unknown>[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [mediaDetails, setMediaDetails] = useState<MediaCard | null>(initialMedia || null);
  const [loadingMediaDetails, setLoadingMediaDetails] = useState(!initialMedia);

  const handleOnError = useCallback((err: unknown) => {
    logger.error(err);
    showHUD("error", err instanceof Error ? err.message : "Ошибка загрузки");
  }, [showHUD]);

  useEffect(() => {
    if (initialMedia) return setMediaDetails(initialMedia);
    if (!mediaType || !mediaId) return;
    setLoadingMediaDetails(true);
    ApiClient.fetchMediaDetails(mediaType, mediaId)
      .then(setMediaDetails)
      .catch(handleOnError)
      .finally(() => setLoadingMediaDetails(false));
  }, [mediaType, mediaId, initialMedia, handleOnError]);

  const currentMedia = mediaDetails || null;
  const mediaTitle = currentMedia?.title;
  const mediaImdbId = currentMedia?.imdbId;

  const [sources, setSources] = useState(() =>
    ExtensionRegistry.getStreamSources().filter((s) => s.supportedTypes.includes(mediaType as "movie" | "tv"))
  );

  useEffect(() => {
    const handleUpdate = () => {
      setSources(ExtensionRegistry.getStreamSources().filter((s) => s.supportedTypes.includes(mediaType as "movie" | "tv")));
    };
    ExtensionRegistry.addListener(handleUpdate);
    return () => ExtensionRegistry.removeListener(handleUpdate);
  }, [mediaType]);

  const [activeTab, setActiveTab] = useState<string>(activeTabParam || "");
  useEffect(() => {
    if (activeTabParam) {
      setActiveTab(activeTabParam);
    } else if (sources.length > 0 && !activeTab) {
      setActiveTab(sources[0].id);
    }
  }, [sources, activeTabParam, activeTab]);

  const activeSource = useMemo(() => sources.find((s) => s.id === activeTab), [sources, activeTab]);

  const [streams, setStreams] = useState<RawStreamPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const resultsCache = useRef<Map<string, RawStreamPayload[]>>(new Map());
  const activeRequestIdRef = useRef<string>("");

  useEffect(() => {
    if (!mediaTitle || !activeTab || !activeSource) return;
    const cached = resultsCache.current.get(activeTab);
    if (cached) return setStreams(cached);

    const reqId = Math.random().toString(36).substring(7);
    activeRequestIdRef.current = reqId;
    setLoading(true);
    setError(null);

    ExtensionRegistry.sendSandboxRequest<RawStreamPayload[]>(activeSource.pluginId, "STREAM_SOURCE_SEARCH", {
      query: { title: mediaTitle, imdbId: mediaImdbId, tmdbId: mediaId, type: mediaType as "movie" | "tv", season, episode },
    })
      .then((results) => {
        if (activeRequestIdRef.current !== reqId) return;
        resultsCache.current.set(activeTab, results || []);
        setStreams(results || []);
      })
      .catch((err) => {
        if (activeRequestIdRef.current !== reqId) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (activeRequestIdRef.current === reqId) setLoading(false);
      });
  }, [mediaTitle, mediaImdbId, activeTab, activeSource, season, episode, refreshTrigger, mediaId, mediaType]);

  const [error, setError] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    if (activeTab) {
      resultsCache.current.delete(activeTab);
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [activeTab]);

  const context = useMemo(() => ({
    type: mediaType as "movie" | "tv",
    tmdbId: mediaId,
    season,
    episode,
  }), [mediaType, mediaId, season, episode]);

  const handleSelectStream = useCallback((stream: RawStreamPayload) => {
    if (!activeSource) return;
    setActionLoading(true);
    if (mediaType === "movie") {
      ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, context })
        .then((info) => playVideo({
          streamUrl: info.streamUrl, title: info.title || currentMedia?.title || "", mediaType: "movie", id: mediaId,
          streamHash: info.torrentHash, streamType: (info.streamType === "m3u8" || info.streamType === "mp4" || info.streamType === "dash") ? info.streamType : undefined,
          audios: info.audios?.map((a) => ({ name: a.name, url: a.url })), headers: info.headers, providerId: info.providerId, voice: info.voice,
        }))
        .catch(handleOnError)
        .finally(() => setActionLoading(false));
    } else {
      setClickedStream(stream);
      ExtensionRegistry.sendSandboxRequest<{ episodes: StreamEpisode[]; tmdbSeasonsCount: number }>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream, context })
        .then((res) => setEpisodeSelectorData({
          title: stream.title || "Выбор серии", episodes: (res.episodes || []).map(mapEpisode),
          tmdbSeasonsCount: res.tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
        }))
        .catch(handleOnError)
        .finally(() => setActionLoading(false));
    }
  }, [activeSource, mediaType, context, mediaId, currentMedia, playVideo, handleOnError]);

  const handlePlayEpisode = useCallback((ep: GenericEpisodeItem) => {
    if (!activeSource || !clickedStream) return;
    setActionLoading(true);
    ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream: clickedStream, episode: ep, context })
      .then((info) => {
        let playlist: any[] | undefined = undefined;
        let playlistIndex: number | undefined = undefined;
        if ((window as any).potok_playlist_override) {
          playlist = (window as any).potok_playlist_override;
          playlistIndex = playlist?.findIndex(
            (item: any) => item.season === ep.season && item.episode === ep.episode
          );
          if (playlistIndex === -1 || playlistIndex === undefined) playlistIndex = 0;
          (window as any).potok_playlist_override = null;
        }

        playVideo({
          streamUrl: info.streamUrl, title: info.title || currentMedia?.title || "", mediaType: "tv", id: mediaId,
          season: ep.season, episode: ep.episode, streamHash: info.torrentHash,
          streamType: (info.streamType === "m3u8" || info.streamType === "mp4" || info.streamType === "dash") ? info.streamType : undefined,
          audios: info.audios?.map((a) => ({ name: a.name, url: a.url })), headers: info.headers, providerId: info.providerId, voice: info.voice,
          playlist,
          playlistIndex
        });
      })
      .catch(handleOnError)
      .finally(() => setActionLoading(false));
  }, [activeSource, clickedStream, context, currentMedia, mediaId, playVideo, handleOnError]);

  const handleStartEditing = useCallback(() => {
    if (!activeSource || !clickedStream) return;
    setSeasonsLoading(true);
    ExtensionRegistry.sendSandboxRequest<Record<string, unknown>[]>(activeSource.pluginId, "STREAM_SOURCE_GET_SEASONS", { stream: clickedStream, context })
      .then(setSeasons)
      .catch(handleOnError)
      .finally(() => setSeasonsLoading(false));
  }, [activeSource, clickedStream, context, handleOnError]);

  const handleApplyOverride = useCallback((seasonNum: number, epNum: number) => {
    if (!activeSource || !clickedStream) return;
    setIsSaving(true);
    ExtensionRegistry.sendSandboxRequest<void>(activeSource.pluginId, "STREAM_SOURCE_SAVE_OVERRIDE", { stream: clickedStream, context, seasonNum, episodeOffset: epNum })
      .then(() => ExtensionRegistry.sendSandboxRequest<{ episodes: StreamEpisode[]; tmdbSeasonsCount: number }>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream: clickedStream, context }))
      .then((res) => setEpisodeSelectorData({
        title: clickedStream.title || "Выбор серии", episodes: (res.episodes || []).map(mapEpisode),
        tmdbSeasonsCount: res.tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
      }))
      .catch(handleOnError)
      .finally(() => setIsSaving(false));
  }, [activeSource, clickedStream, context, currentMedia, handleOnError]);

  return {
    loadingMediaDetails, currentMedia, sources, activeTab, setActiveTab, streams, loading, error, handleRefresh,
    handleSelectStream, clickedStream, setClickedStream, episodeSelectorData, setEpisodeSelectorData,
    handlePlayEpisode, handleStartEditing, handleApplyOverride, seasons, seasonsLoading, isSaving, actionLoading,
  };
}

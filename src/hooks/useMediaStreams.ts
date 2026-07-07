import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useHUD } from "../context/HUDContext";
import { usePlayback } from "../context/AppSettingsContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import type { GenericEpisodeItem } from "../components/common/EpisodeSelectorPopup";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import type { RawStreamPayload, StreamEpisode, PlaybackInfo, PlaybackMetadata } from "@potok/sdk-types";
import type { ActivePlayback } from "../context/AppSettingsContext";
import { logger } from "../utils/logger";
import { SyncApiClient, type UserHistoryEntry } from "../network/SyncApiClient";
import { Storage } from "../utils/StorageService";
import type { PlaybackProgress } from "./usePlaybackTracker";

const mapEpisode = (ep: StreamEpisode): GenericEpisodeItem => ({
  id: ep.id, season: ep.season, episode: ep.episode, title: ep.title,
  rawSeason: ep.rawSeason, rawEpisode: ep.rawEpisode, fileName: ep.fileName,
  stillPath: ep.stillPath, airDate: ep.airDate,
  audios: ep.audios || [], url: ep.url,
});

const ALLOWED_STREAM_TYPES = ["m3u8", "hls", "mp4", "dash"] as const;

// Turn a plugin's PlaybackInfo into an ActivePlayback, forwarding the FULL descriptor (subtitles,
// duration, intro/outro, fileIndex, session) that used to be dropped here — the plugin now owns all
// TorrentGo-shaped data and the player just consumes it.
const buildPlaybackFromInfo = (
  info: PlaybackInfo,
  base: {
    mediaType: "movie" | "tv"; id: number; title?: string; originalTitle?: string; englishTitle?: string;
    season?: number; episode?: number; playlist?: ActivePlayback["playlist"]; playlistIndex?: number;
  }
): ActivePlayback => ({
  streamUrl: info.streamUrl,
  title: info.title || base.title || "",
  originalTitle: base.originalTitle,
  englishTitle: base.englishTitle,
  mediaType: base.mediaType,
  id: base.id,
  season: base.season,
  episode: base.episode,
  streamHash: info.torrentHash,
  fileIndex: info.fileIndex,
  streamType: ALLOWED_STREAM_TYPES.includes(info.streamType as typeof ALLOWED_STREAM_TYPES[number])
    ? (info.streamType as ActivePlayback["streamType"])
    : undefined,
  audios: info.audios?.map((a) => ({ name: a.name, url: a.url })),
  headers: info.headers,
  providerId: info.providerId,
  voice: info.voice,
  subtitles: info.subtitles,
  session: info.session,
  duration: info.duration,
  introStart: info.introStart,
  introEnd: info.introEnd,
  outroStart: info.outroStart,
  outroEnd: info.outroEnd,
  thumbnails: info.thumbnails,
  requiresBuffering: info.requiresBuffering,
  playlist: base.playlist,
  playlistIndex: base.playlistIndex,
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
  const { i18n } = useTranslation();
  const { playVideo, enrichPlayback } = usePlayback();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [clickedStream, setClickedStream] = useState<RawStreamPayload | null>(null);
  const shouldForceNextSearchRef = useRef(false);
  const [episodeSelectorData, setEpisodeSelectorData] = useState<{
    title: string; episodes: GenericEpisodeItem[]; tmdbSeasonsCount: number;
    seasonMap?: Record<string, { season: number; offset: number }>;
  } | null>(null);

  const hasPopupParam = searchParams.get("popup") === "true";

  useEffect(() => {
    if (hasPopupParam) {
      if (!clickedStream || !episodeSelectorData) {
        try {
          const savedStream = sessionStorage.getItem("potok_popup_stream");
          const savedData = sessionStorage.getItem("potok_popup_data");
          if (savedStream && savedData) {
            setClickedStream(JSON.parse(savedStream));
            setEpisodeSelectorData(JSON.parse(savedData));
          } else {
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.delete("popup");
              return next;
            }, { replace: true });
          }
        } catch (e) {
          logger.error("Failed to restore popup state from sessionStorage", e);
        }
      }
    } else {
      if (clickedStream || episodeSelectorData) {
        setClickedStream(null);
        setEpisodeSelectorData(null);
        sessionStorage.removeItem("potok_popup_stream");
        sessionStorage.removeItem("potok_popup_data");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPopupParam]);

  const handleClosePopup = useCallback(() => {
    if (searchParams.get("popup") === "true") {
      navigate(-1);
    } else {
      setEpisodeSelectorData(null);
      setClickedStream(null);
      sessionStorage.removeItem("potok_popup_stream");
      sessionStorage.removeItem("potok_popup_data");
    }
  }, [searchParams, navigate]);

  const [remoteHistory, setRemoteHistory] = useState<UserHistoryEntry[]>([]);

  useEffect(() => {
    const strategy = Storage.get<string>("syncStrategy", "none");
    if (strategy === "server" || strategy === "trakt") {
      SyncApiClient.fetchSyncHistory()
        .then((history) => {
          if (history) setRemoteHistory(history);
        })
        .catch((err) => logger.error("[useMediaStreams] Failed to load sync history:", err));
    }
  }, [mediaId]);

  const [seasons, setSeasons] = useState<Record<string, unknown>[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [mediaDetails, setMediaDetails] = useState<MediaCard | null>(() => {
    if (initialMedia) return initialMedia;
    if (mediaType && mediaId) {
      return ApiClient.getCachedMediaDetails(mediaType, mediaId);
    }
    return null;
  });
  const [loadingMediaDetails, setLoadingMediaDetails] = useState(() => {
    if (initialMedia) return false;
    if (mediaType && mediaId && ApiClient.getCachedMediaDetails(mediaType, mediaId)) {
      return false;
    }
    return true;
  });

  const handleOnError = useCallback((err: unknown) => {
    logger.error(err);
    showHUD("error", err instanceof Error ? err.message : i18n.t("common:loadError"));
  }, [showHUD, i18n]);

  useEffect(() => {
    if (initialMedia) return setMediaDetails(initialMedia);
    if (!mediaType || !mediaId) return;
    const cached = ApiClient.getCachedMediaDetails(mediaType, mediaId);
    if (cached) {
      setMediaDetails(cached);
      setLoadingMediaDetails(false);
      return;
    }
    setLoadingMediaDetails(true);
    ApiClient.fetchMediaDetails(mediaType, mediaId)
      .then(setMediaDetails)
      .catch(handleOnError)
      .finally(() => setLoadingMediaDetails(false));
  }, [mediaType, mediaId, initialMedia, handleOnError, i18n.language]);

  const currentMedia = mediaDetails || null;

  const mapEpisodesWithWatched = useCallback((epsList: StreamEpisode[]): GenericEpisodeItem[] => {
    return (epsList || []).map((ep) => {
      const mapped = mapEpisode(ep);
      const sNum = mapped.season;
      const epNum = mapped.episode;

      let isWatched = false;

      // Only evaluate watched state if season and episode numbers are parsed
      if (sNum !== undefined && epNum !== undefined) {
        // 1. Media Details progress check (loaded directly from server payload - primary cloud source)
        if (currentMedia && String(currentMedia.id) === String(mediaId) && currentMedia.progress?.watchedEpisodes) {
          isWatched = currentMedia.progress.watchedEpisodes.some(
            (we) => Number(we.season) === Number(sNum) && Number(we.number) === Number(epNum)
          );
        }

        // 2. Remote check (server history API - backup cloud source)
        if (!isWatched) {
          const entry = remoteHistory.find(
            (h) =>
              String(h.tmdbId) === String(mediaId) &&
              Number(h.seasonNumber) === Number(sNum) &&
              Number(h.episodeNumber) === Number(epNum)
          );
          if (entry) {
            isWatched = entry.progressSeconds >= entry.durationSeconds ||
              (entry.durationSeconds > 0 && entry.progressSeconds / entry.durationSeconds >= 0.90);
          }
        }

        // 3. Local check (local-first offline backup)
        if (!isWatched) {
          const progressKey = `potok_progress:${mediaId}:${sNum}:${epNum}`;
          const localProgress = Storage.get<PlaybackProgress | null>(progressKey, null);
          isWatched = localProgress?.isCompleted === true;
          if (!isWatched && localProgress && localProgress.durationSeconds > 0) {
            isWatched = localProgress.progressSeconds / localProgress.durationSeconds >= 0.90;
          }
        }
      }

      return { ...mapped, isWatched };
    });
  }, [mediaId, remoteHistory, currentMedia]);

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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const resultsCache = useRef<Map<string, RawStreamPayload[]>>(new Map());
  const activeRequestIdRef = useRef<string>("");

  // Sync state and show loader instantly when tab/source changes to prevent layout flashing
  useEffect(() => {
    if (activeTab) {
      const cached = resultsCache.current.get(activeTab);
      if (cached) {
        setStreams(cached);
        setLoading(false);
      } else {
        setStreams([]);
        setLoading(true);
      }
    } else if (sources.length === 0 && !loadingMediaDetails) {
      setLoading(false);
    }
  }, [activeTab, sources.length, loadingMediaDetails]);

  useEffect(() => {
    if (!mediaTitle || !activeTab || !activeSource) return;
    const cached = resultsCache.current.get(activeTab);
    if (cached) {
      setStreams(cached);
      setLoading(false);
      return;
    }

    const isForce = shouldForceNextSearchRef.current;
    shouldForceNextSearchRef.current = false;

    const reqId = Math.random().toString(36).substring(7);
    activeRequestIdRef.current = reqId;
    setLoading(true);
    setError(null);

    ExtensionRegistry.sendSandboxRequest<RawStreamPayload[]>(activeSource.pluginId, "STREAM_SOURCE_SEARCH", {
      query: { title: mediaTitle, imdbId: mediaImdbId, tmdbId: mediaId, type: mediaType as "movie" | "tv", season, episode, forceSearch: isForce },
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
      shouldForceNextSearchRef.current = true;
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [activeTab]);

  const context = useMemo(() => ({
    type: mediaType as "movie" | "tv",
    tmdbId: mediaId,
    title: mediaTitle || "",
    season,
    episode,
  }), [mediaType, mediaId, mediaTitle, season, episode]);

  // Two-phase play: getPlaybackInfo opens the player INSTANTLY (no /metadata probe). This fires the deferred
  // getPlaybackMetadata in the background and merges subtitles/duration into the LIVE playback once the (slow)
  // probe resolves — the player is already reactive to late subtitles. Torrent-only; no-op for online sources
  // (they return a complete descriptor and don't implement getPlaybackMetadata → empty result).
  const deferMetadata = useCallback((pluginId: string, stream: RawStreamPayload, episode: unknown, info: PlaybackInfo) => {
    if (!info.torrentHash) return;
    ExtensionRegistry.sendSandboxRequest<PlaybackMetadata>(pluginId, "STREAM_SOURCE_GET_PLAYBACK_METADATA", { stream, episode, context })
      .then((meta) => {
        if (!meta) return;
        const patch: Partial<ActivePlayback> = {};
        if (meta.subtitles) patch.subtitles = meta.subtitles;
        if (typeof meta.duration === "number") patch.duration = meta.duration;
        if (Object.keys(patch).length > 0) {
          enrichPlayback(patch, { streamHash: info.torrentHash, fileIndex: info.fileIndex });
        }
      })
      .catch(() => { /* degraded — player keeps playing, just without track menus */ });
  }, [context, enrichPlayback]);

  const handleSelectStream = useCallback((stream: RawStreamPayload) => {
    if (!activeSource) return;
    setActionLoading(true);

    if (mediaType === "movie" && stream.kind !== "torrent") {
      // Normal online balancers directly fetch playback info and play
      ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, context })
        .then((info) => {
          if (!info) {
            throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
          }
          playVideo(buildPlaybackFromInfo(info, {
            mediaType: "movie",
            id: mediaId,
            title: currentMedia?.title || "",
            originalTitle: currentMedia?.originalTitle || currentMedia?.title || "",
            englishTitle: currentMedia?.englishTitle || "",
          }));
        })
        .catch(handleOnError)
        .finally(() => setActionLoading(false));
    } else {
      // Torrents always fetch files list first to know what they contain
      setClickedStream(stream);
      ExtensionRegistry.sendSandboxRequest<{ episodes: StreamEpisode[]; tmdbSeasonsCount: number; seasonMap?: Record<string, { season: number; offset: number }> }>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream, context })
        .then((res) => {
          const eps = res.episodes || [];
          if (eps.length === 1) {
            // Exactly 1 video file in the torrent: play it immediately
            const singleEp = mapEpisode(eps[0]);
            return ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(activeSource.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", { stream, episode: singleEp, context })
              .then((info) => {
                if (!info) {
                  throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
                }
                playVideo(buildPlaybackFromInfo(info, {
                  mediaType: mediaType as "movie" | "tv",
                  id: mediaId,
                  title: currentMedia?.title || "",
                  originalTitle: currentMedia?.originalTitle || currentMedia?.title || "",
                  englishTitle: currentMedia?.englishTitle || "",
                  season: mediaType === "tv" ? singleEp.season : undefined,
                  episode: mediaType === "tv" ? singleEp.episode : undefined,
                }));
                deferMetadata(activeSource.pluginId, stream, singleEp, info);
                setClickedStream(null);
              });
          } else {
            // Multiple files: show files list selector popup
            const data = {
              title: stream.title || (mediaType === "movie" ? i18n.t("media:streams.fileSelection") : i18n.t("media:streams.episodeSelection")),
              episodes: mapEpisodesWithWatched(eps),
              tmdbSeasonsCount: res.tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
              seasonMap: res.seasonMap || {},
            };
            sessionStorage.setItem("potok_popup_stream", JSON.stringify(stream));
            sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
            setClickedStream(stream);
            setEpisodeSelectorData(data);
            setSearchParams(prev => {
              const next = new URLSearchParams(prev);
              next.set("popup", "true");
              return next;
            });
          }
        })
        .catch(handleOnError)
        .finally(() => setActionLoading(false));
    }
  }, [activeSource, mediaType, context, mediaId, currentMedia, playVideo, deferMetadata, handleOnError, season, episode, mapEpisodesWithWatched, setSearchParams, i18n]);

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

        // Lazy re-fetch bridge: the player has no plugin handle, so expose a resolver it can call on
        // episode switch to get a FRESH full descriptor (session/subtitles/audios) for the next item —
        // instead of replaying the stale pre-built playlist URL (which carries no session/subs). Captures
        // this torrent's source/stream/context for the whole playlist session.
        if (playlist) {
          const src = activeSource;
          const stream = clickedStream;
          const ctx = context;
          (window as any).potok_playlist_resolve = async (item: any): Promise<PlaybackInfo> => {
            const nextEp = { id: item.id, season: item.season, episode: item.episode, title: item.title, url: item.streamUrl, audios: [] };
            const nextInfo = await ExtensionRegistry.sendSandboxRequest<PlaybackInfo>(src.pluginId, "STREAM_SOURCE_GET_PLAYBACK_INFO", {
              stream, episode: nextEp, context: ctx,
            });
            // Next-episode is a WARM path (torrent already connected) → fold the deferred metadata in inline so
            // the switched-to episode keeps its subtitles/duration (getPlaybackInfo alone omits them now).
            try {
              const meta = await ExtensionRegistry.sendSandboxRequest<PlaybackMetadata>(src.pluginId, "STREAM_SOURCE_GET_PLAYBACK_METADATA", {
                stream, episode: nextEp, context: ctx,
              }, 15000); // next-episode switch is inline → cap the wait (warm path; degrades to no-subs on timeout)
              if (meta && nextInfo) {
                return { ...nextInfo, subtitles: meta.subtitles ?? nextInfo.subtitles, duration: meta.duration ?? nextInfo.duration };
              }
            } catch { /* degraded — play without track menus */ }
            return nextInfo;
          };
        } else {
          (window as any).potok_playlist_resolve = null;
        }

        if (!info) {
          throw new Error(i18n.t("media:streams.playbackInfoEmpty"));
        }
        playVideo(buildPlaybackFromInfo(info, {
          mediaType: mediaType as "movie" | "tv",
          id: mediaId,
          title: currentMedia?.title || "",
          originalTitle: currentMedia?.originalTitle || currentMedia?.title || "",
          englishTitle: currentMedia?.englishTitle || "",
          season: mediaType === "tv" ? ep.season : undefined,
          episode: mediaType === "tv" ? ep.episode : undefined,
          playlist,
          playlistIndex,
        }));
        deferMetadata(activeSource.pluginId, clickedStream, ep, info);
      })
      .catch(handleOnError)
      .finally(() => setActionLoading(false));
  }, [activeSource, clickedStream, context, currentMedia, mediaId, playVideo, deferMetadata, handleOnError, mediaType, i18n]);

  const handleStartEditing = useCallback(() => {
    if (!activeSource || !clickedStream) return;
    setSeasonsLoading(true);
    ExtensionRegistry.sendSandboxRequest<Record<string, unknown>[]>(activeSource.pluginId, "STREAM_SOURCE_GET_SEASONS", { stream: clickedStream, context })
      .then(setSeasons)
      .catch(handleOnError)
      .finally(() => setSeasonsLoading(false));
  }, [activeSource, clickedStream, context, handleOnError]);

  // Per-season override: remap one SOURCE season → a TMDB (targetSeason, offset). sourceSeason is null for the
  // sentinel bucket (files with no parseable season). offset is computed by the popup on RAW parsed episodes
  // (offset = targetEpisode − rawSectionFirstEpisode), so it never compounds on a previous mapping.
  const handleApplyOverride = useCallback((sourceSeason: number | null, targetSeason: number, offset: number) => {
    if (!activeSource || !clickedStream) return;
    setIsSaving(true);
    ExtensionRegistry.sendSandboxRequest<void>(activeSource.pluginId, "STREAM_SOURCE_SAVE_OVERRIDE", { stream: clickedStream, context, sourceSeason, targetSeason, offset })
      .then(() => ExtensionRegistry.sendSandboxRequest<{ episodes: StreamEpisode[]; tmdbSeasonsCount: number; seasonMap?: Record<string, { season: number; offset: number }> }>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream: clickedStream, context }))
      .then((res) => {
        const data = {
          title: clickedStream.title || i18n.t("media:streams.episodeSelection"), episodes: mapEpisodesWithWatched(res.episodes || []),
          tmdbSeasonsCount: res.tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
          seasonMap: res.seasonMap || {},
        };
        sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
        setEpisodeSelectorData(data);
      })
      .catch(handleOnError)
      .finally(() => setIsSaving(false));
  }, [activeSource, clickedStream, context, currentMedia, handleOnError, mapEpisodesWithWatched, i18n]);

  // Reset one source season's override (delete the entry → it falls back to auto-parse), then refetch.
  const handleResetOverride = useCallback((sourceSeason: number | null) => {
    if (!activeSource || !clickedStream) return;
    setIsSaving(true);
    ExtensionRegistry.sendSandboxRequest<void>(activeSource.pluginId, "STREAM_SOURCE_CLEAR_OVERRIDE", { stream: clickedStream, context, sourceSeason })
      .then(() => ExtensionRegistry.sendSandboxRequest<{ episodes: StreamEpisode[]; tmdbSeasonsCount: number; seasonMap?: Record<string, { season: number; offset: number }> }>(activeSource.pluginId, "STREAM_SOURCE_GET_EPISODES", { stream: clickedStream, context }))
      .then((res) => {
        const data = {
          title: clickedStream.title || i18n.t("media:streams.episodeSelection"), episodes: mapEpisodesWithWatched(res.episodes || []),
          tmdbSeasonsCount: res.tmdbSeasonsCount || currentMedia?.numberOfSeasons || 1,
          seasonMap: res.seasonMap || {},
        };
        sessionStorage.setItem("potok_popup_data", JSON.stringify(data));
        setEpisodeSelectorData(data);
      })
      .catch(handleOnError)
      .finally(() => setIsSaving(false));
  }, [activeSource, clickedStream, context, currentMedia, handleOnError, mapEpisodesWithWatched, i18n]);

  return {
    loadingMediaDetails, currentMedia, sources, activeTab, setActiveTab, streams, loading, error, handleRefresh,
    handleSelectStream, clickedStream, setClickedStream, episodeSelectorData, setEpisodeSelectorData,
    handlePlayEpisode, handleStartEditing, handleApplyOverride, handleResetOverride, seasons, seasonsLoading, isSaving, actionLoading,
    handleClosePopup,
  };
}

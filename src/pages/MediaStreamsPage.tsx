import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { useTorrentsPage } from "../hooks/useTorrentsPage";
import StreamSkeletonList from "../components/StreamSkeletonList";
import StreamRowComponent from "../components/StreamRowComponent";
import { TorrentFilesPopup } from "../components/TorrentFilesPopup";
import { TorrentsSidebar } from "../components/TorrentsSidebar";
import { TorrentsFilterBar } from "../components/TorrentsFilterBar";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import { getPluralForm } from "../utils/formatters";
import { EpisodeSelectorPopup } from "../components/common/EpisodeSelectorPopup";
import { useAppSettings } from "../context/AppSettingsContext";
import { ExtensionRegistry } from "../utils/extensions/ExtensionRegistry";
import StreamList from "../components/common/StreamList";
import "../styles/media.css";

interface MediaStreamsPageProps {
  mode: "torrents" | "online";
}

export const MediaStreamsPage: React.FC<MediaStreamsPageProps> = ({ mode }) => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { show: showHUD } = useHUD();

  const mediaId = Number(id);
  const state = location.state as { season?: number; episode?: number; media?: any } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;

  // Selected torrent for files popup (Torrents mode only)
  const [selectedTorrent, setSelectedTorrent] = useState<any | null>(null);

  // Active state for generic episode selector modal
  const [episodeSelectorData, setEpisodeSelectorData] = useState<{
    title: string;
    episodes: any[];
    onPlay: (episode: any, audioId: string) => void;
    onStartEditing?: () => void;
    onApplyOverride?: (seasonNum: number, epNum: number) => void;
    seasons?: any[];
    seasonsLoading?: boolean;
    isSaving?: boolean;
    tmdbSeasonsCount?: number;
  } | null>(null);

  useEffect(() => {
    const handleShowSelector = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setEpisodeSelectorData((prev) => {
          if (!prev) return customEvent.detail;
          
          const cleanDetail = { ...customEvent.detail };
          Object.keys(cleanDetail).forEach((key) => {
            if (cleanDetail[key] === undefined) {
              delete cleanDetail[key];
            }
          });

          return {
            ...prev,
            ...cleanDetail
          };
        });
      }
    };
    window.addEventListener("potok:show-episode-selector", handleShowSelector);
    return () => {
      window.removeEventListener("potok:show-episode-selector", handleShowSelector);
    };
  }, []);

  const handleOnError = useCallback((msg: string) => {
    showHUD("error", msg);
  }, [showHUD]);

  // Dynamic media details state to populate sidebar/online slots on direct page reload
  const [mediaDetails, setMediaDetails] = useState<MediaCard | null>(initialMedia || null);
  const [loadingMediaDetails, setLoadingMediaDetails] = useState(!initialMedia);

  useEffect(() => {
    if (initialMedia) {
      setMediaDetails(initialMedia);
      setLoadingMediaDetails(false);
      return;
    }
    if (!mediaType || !mediaId) return;

    let isMounted = true;
    setLoadingMediaDetails(true);
    ApiClient.fetchMediaDetails(mediaType, mediaId)
      .then((data) => {
        if (isMounted) {
          setMediaDetails(data);
          setLoadingMediaDetails(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          handleOnError(err instanceof Error ? err.message : "Ошибка загрузки деталей медиа");
          setLoadingMediaDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mediaType, mediaId, initialMedia, handleOnError]);

  // Hook for Torrents Mode (deactivated in online mode by passing undefined ids)
  const torrentsState = useTorrentsPage({
    mediaType: mode === "torrents" ? mediaType : undefined,
    mediaId: mode === "torrents" ? mediaId : undefined,
    season,
    episode,
    initialMedia: mode === "torrents" ? initialMedia : undefined,
    onError: handleOnError,
  });

  const currentMedia = torrentsState.media || mediaDetails || null;
  const isMediaLoading = mode === "torrents" ? torrentsState.loadingMedia : loadingMediaDetails;

  const { playVideo } = useAppSettings();

  // Reactive subscription to plugin registry changes to dynamically render segments/tabs
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };
    ExtensionRegistry.addListener(handleUpdate);
    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, []);

  const hasOnlinePlugin = tick >= 0 && ExtensionRegistry.getSearchProviders().length > 0;

  // Online Streams state
  const [onlineStreams, setOnlineStreams] = useState<any[]>([]);
  const [loadingOnlineStreams, setLoadingOnlineStreams] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reactive query of online streams
  useEffect(() => {
    if (mode !== "online" || !currentMedia) return;

    let isMounted = true;
    setLoadingOnlineStreams(true);
    setOnlineError(null);

    const searchQuery = {
      title: currentMedia.title,
      imdbId: currentMedia.imdbId,
      tmdbId: currentMedia.id,
      type: mediaType === "tv" ? ("tv" as const) : ("movie" as const),
      season,
      episode
    };

    ExtensionRegistry.triggerSearch(searchQuery)
      .then((results) => {
        if (isMounted) {
          setOnlineStreams(results || []);
          setLoadingOnlineStreams(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : "Ошибка при поиске онлайн потоков";
          setOnlineError(errMsg);
          handleOnError(errMsg);
          setLoadingOnlineStreams(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mode, currentMedia, mediaType, season, episode, handleOnError, refreshTrigger]);

  const handleSelectOnlineStream = useCallback((stream: any) => {
    if (!stream.url) {
      handleOnError("Выбранный поток не содержит рабочей ссылки");
      return;
    }

    let streamType: "m3u8" | "mp4" | "dash" = "mp4";
    if (stream.kind === "hls" || stream.url.includes(".m3u8")) {
      streamType = "m3u8";
    } else if (stream.kind === "mp4" || stream.url.includes(".mp4")) {
      streamType = "mp4";
    } else if (stream.kind === "dash" || stream.url.includes(".mpd")) {
      streamType = "dash";
    }

    playVideo({
      streamUrl: stream.url,
      title: stream.title || currentMedia?.title || "Без названия",
      mediaType: mediaType === "tv" ? "tv" : "movie",
      id: mediaId,
      season,
      episode,
      streamType,
      headers: stream.headers
    });
  }, [playVideo, currentMedia, mediaType, mediaId, season, episode, handleOnError]);

  if (!isMediaLoading && !currentMedia) {
    return (
      <div className="media-not-found-container">
        <ShieldAlert size={48} className="media-not-found-icon" />
        <h2 className="media-not-found-title">Медиа не найдено</h2>
        <button className="btn-glass" onClick={() => navigate(-1)}>Назад</button>
      </div>
    );
  }

  return (
    <div className="torrents-page-layout">
      {/* Shared Immersive backdrop */}
      <div
        className="torrents-page-backdrop"
        style={{ backgroundImage: `url(${currentMedia?.backdropSrc || ""})` }}
      />

      {/* Shared Sidebar layout */}
      {currentMedia ? (
        <TorrentsSidebar 
          media={currentMedia}
          season={season}
          episode={episode}
          onBack={() => navigate(-1)}
        />
      ) : (
        <aside className="torrents-page-sidebar skeleton-loading">
          <button className="torrents-sidebar-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="torrents-sidebar-poster skeleton" style={{ height: "360px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} />
        </aside>
      )}

      {/* Dynamic Content Column */}
      <section className="torrents-page-content" style={{ display: "flex", flexDirection: "column" }}>
        {hasOnlinePlugin && (
          <div className="tabs-header" style={{ marginBottom: "var(--space-m)" }}>
            <button
              className={`tab-btn ${mode === "torrents" ? "active" : ""}`}
              onClick={() => navigate(`/media/${mediaType}/${mediaId}/torrents${location.search}`, { state })}
            >
              Торренты
            </button>
            <button
              className={`tab-btn ${mode === "online" ? "active" : ""}`}
              onClick={() => navigate(`/media/${mediaType}/${mediaId}/online${location.search}`, { state })}
            >
              Онлайн
            </button>
          </div>
        )}

        {mode === "torrents" ? (
          <>
            {/* Torrents Mode content layout */}
            <TorrentsFilterBar 
              countLabel={`${torrentsState.torrents.length} ${getPluralForm(torrentsState.torrents.length, ["торрент", "торрента", "торрентов"])}`}
              sortOption={torrentsState.sortOption}
              setSortOption={torrentsState.setSortOption}
              qualityFilter={torrentsState.qualityFilter}
              setQualityFilter={torrentsState.setQualityFilter}
              activeTracker={torrentsState.activeTracker}
              setActiveTracker={torrentsState.setActiveTracker}
              trackers={torrentsState.trackers}
              onRefresh={torrentsState.refetch}
            />

            <div className="torrents-results-list">
              {torrentsState.loadingTorrents ? (
                <StreamSkeletonList />
              ) : torrentsState.torrents.length > 0 ? (
                torrentsState.torrents.map((t, index) => (
                  <StreamRowComponent
                    key={t.id || index}
                    torrent={t}
                    onClick={setSelectedTorrent}
                  />
                ))
              ) : (
                <div className="torrent-empty-state">
                  <ShieldAlert size={40} opacity={0.5} />
                  <span className="torrent-empty-state-text">Раздач не найдено. Попробуйте сменить фильтры.</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Online mode content slot contribution */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <StreamList
              streams={onlineStreams}
              loading={loadingOnlineStreams}
              onSelectStream={handleSelectOnlineStream}
              onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
              emptyText={onlineError || undefined}
            />
          </div>
        )}
      </section>
 
      {/* Selected torrent files dynamic popup sheet */}
      {selectedTorrent && currentMedia && (
        <TorrentFilesPopup
          isOpen={!!selectedTorrent}
          onClose={() => setSelectedTorrent(null)}
          torrent={selectedTorrent}
          mediaItem={currentMedia}
          seasonNumber={season}
          episodeNumber={episode}
        />
      )}

      {/* Generic Episode Selector Popup Sheet */}
      {episodeSelectorData && (
        <EpisodeSelectorPopup
          isOpen={!!episodeSelectorData}
          onClose={() => setEpisodeSelectorData(null)}
          title={episodeSelectorData.title}
          episodes={episodeSelectorData.episodes}
          onPlay={episodeSelectorData.onPlay}
          onStartEditing={episodeSelectorData.onStartEditing}
          onApplyOverride={episodeSelectorData.onApplyOverride}
          seasons={episodeSelectorData.seasons}
          seasonsLoading={episodeSelectorData.seasonsLoading}
          isSaving={episodeSelectorData.isSaving}
          tmdbSeasonsCount={episodeSelectorData.tmdbSeasonsCount}
        />
      )}
    </div>
  );
};

export default MediaStreamsPage;

import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { TorrentFilesPopup } from "../components/TorrentFilesPopup";
import { StreamSidebar } from "../components/StreamSidebar";
import { ApiClient } from "../network/ApiClient";
import type { MediaCard } from "../network/ApiTypes";
import { EpisodeSelectorPopup } from "../components/common/EpisodeSelectorPopup";
import { DynamicBlock } from "../components/common/DynamicBlock";
import "../styles/media.css";

export const MediaStreamsPage: React.FC = () => {
  const { mediaType, id, tab } = useParams<{ mediaType: string; id: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { show: showHUD } = useHUD();

  const mediaId = Number(id);
  const state = location.state as { season?: number; episode?: number; media?: any; tab?: string } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;

  // State for dynamic torrent files popup sheet triggerable via global event
  const [torrentFilesData, setTorrentFilesData] = useState<{
    torrent: any;
    mediaItem: any;
    seasonNumber?: number;
    episodeNumber?: number;
  } | null>(null);

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

    const handleShowTorrentFiles = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setTorrentFilesData(customEvent.detail);
      }
    };

    window.addEventListener("potok:show-episode-selector", handleShowSelector);
    window.addEventListener("potok:show-torrent-files", handleShowTorrentFiles);

    return () => {
      window.removeEventListener("potok:show-episode-selector", handleShowSelector);
      window.removeEventListener("potok:show-torrent-files", handleShowTorrentFiles);
    };
  }, []);

  const handleOnError = useCallback((msg: string) => {
    showHUD("error", msg);
  }, [showHUD]);

  // Dynamic media details state to populate sidebar
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

  const currentMedia = mediaDetails || null;
  const isMediaLoading = loadingMediaDetails;

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
        <StreamSidebar 
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

      <section className="torrents-page-content" style={{ display: "flex", flexDirection: "column" }}>
        <DynamicBlock
          name="media-streams-header"
          contextProps={{ mediaId, mediaType, season, episode, title: currentMedia?.title, tab: tab || "potok-torrents" }}
        >
          <div id="streams-header-default" />
        </DynamicBlock>

        <DynamicBlock
          name="media-streams-filters"
          contextProps={{ mediaId, mediaType, season, episode, title: currentMedia?.title, tab: tab || "potok-torrents" }}
        >
          <div id="streams-filter-bar" />
        </DynamicBlock>

        <DynamicBlock
          name="media-streams-results"
          contextProps={{ mediaId, mediaType, season, episode, title: currentMedia?.title, tab: tab || "potok-torrents" }}
        >
          <div className="torrents-results-list" id="streams-results-list" />
        </DynamicBlock>
      </section>
 
      {/* Selected torrent files dynamic popup sheet */}
      {torrentFilesData && (
        <TorrentFilesPopup
          isOpen={!!torrentFilesData}
          onClose={() => setTorrentFilesData(null)}
          torrent={torrentFilesData.torrent}
          mediaItem={currentMedia || torrentFilesData.mediaItem}
          seasonNumber={torrentFilesData.seasonNumber ?? season}
          episodeNumber={torrentFilesData.episodeNumber ?? episode}
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

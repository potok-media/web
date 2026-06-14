import React from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { StreamList } from "../components/common/StreamList";
import { StreamSidebar } from "../components/StreamSidebar";
import { EpisodeSelectorPopup } from "../components/common/EpisodeSelectorPopup";
import { useMediaStreams } from "../hooks/useMediaStreams";
import type { MediaCard } from "../network/ApiTypes";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";
import "../styles/media.css";

export const MediaStreamsPage: React.FC = () => {
  usePerformanceTrack("MediaStreamsPage");
  const { mediaType, id, tab } = useParams<{ mediaType: string; id: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const mediaId = Number(id);
  const state = location.state as { season?: number; episode?: number; media?: MediaCard } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;

  const {
    loadingMediaDetails,
    currentMedia,
    streams,
    loading,
    error,
    handleRefresh,
    handleSelectStream,
    clickedStream,
    episodeSelectorData,
    handleClosePopup,
    handlePlayEpisode,
    handleStartEditing,
    handleApplyOverride,
    seasons,
    seasonsLoading,
    isSaving,
    actionLoading,
  } = useMediaStreams({
    mediaType,
    mediaId,
    season,
    episode,
    initialMedia,
    activeTab: tab,
  });

  const renderSidebar = () => {
    if (currentMedia) {
      return <StreamSidebar media={currentMedia} season={season} episode={episode} onBack={() => navigate(-1)} />;
    }
    return (
      <aside className="streams-page-sidebar skeleton-loading">
        <button className="streams-sidebar-back-btn" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <div className="streams-sidebar-poster skeleton" style={{ height: "360px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} />
      </aside>
    );
  };

  const renderContent = () => (
    <section className="streams-page-content" style={{ display: "flex", flexDirection: "column" }}>
      <div className="streams-scroll-area">
        <StreamList
          streams={streams}
          loading={loading}
          showFilters={true}
          emptyText={error || "Потоков не найдено. Попробуйте сменить фильтры."}
          onSelectStream={handleSelectStream}
          onRefresh={handleRefresh}
        />
      </div>
    </section>
  );

  const renderPopup = () => {
    if (!episodeSelectorData || !clickedStream) return null;
    return (
      <EpisodeSelectorPopup
        isOpen={!!episodeSelectorData}
        onClose={handleClosePopup}
        title={episodeSelectorData.title}
        episodes={episodeSelectorData.episodes}
        onPlay={handlePlayEpisode}
        onStartEditing={handleStartEditing}
        onApplyOverride={handleApplyOverride}
        seasons={seasons}
        seasonsLoading={seasonsLoading}
        isSaving={isSaving}
        tmdbSeasonsCount={episodeSelectorData.tmdbSeasonsCount}
        backdropSrc={currentMedia?.backdropSrc}
        posterSrc={currentMedia?.posterSrc}
        mediaType={mediaType}
      />
    );
  };

  if (!loadingMediaDetails && !currentMedia) {
    return (
      <div className="media-not-found-container">
        <ShieldAlert size={48} className="media-not-found-icon" />
        <h2 className="media-not-found-title">Медиа не найдено</h2>
        <button className="btn-glass" onClick={() => navigate(-1)}>Назад</button>
      </div>
    );
  }

  return (
    <div className="streams-page-layout">
      <div className="streams-page-backdrop" style={{ backgroundImage: `url(${currentMedia?.backdropSrc || ""})` }} />
      {renderSidebar()}
      {renderContent()}
      {renderPopup()}
      {actionLoading && (
        <div className="saving-overlay" style={{ position: "fixed", background: "rgba(20, 20, 25, 0.5)", backdropFilter: "blur(4px)" }}>
          <div className="saving-content">
            <div className="premium-spinner">
              <div className="spinner-outer" />
              <div className="spinner-inner" />
            </div>
            <span style={{ marginTop: "12px", fontSize: "0.95rem", color: "#fff", fontWeight: 500 }}>
              Получение информации...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaStreamsPage;

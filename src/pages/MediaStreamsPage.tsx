import React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { StreamList } from "../components/common/StreamList";
import { StreamSidebar } from "../components/StreamSidebar";
import { EpisodeSelectorPopup } from "../components/common/EpisodeSelectorPopup";
import { FocusableButton } from "../components/common/TVNavigation";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { PlatformManager } from "../utils/PlatformManager";
import { useMediaStreams } from "../hooks/useMediaStreams";
import type { MediaCard } from "../network/ApiTypes";
import "../styles/media.css";

export const MediaStreamsPage: React.FC = () => {
  const { t } = useTranslation("streams");
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
    handleResetOverride,
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

  // TV: land focus on the first stream row once results arrive (otherwise focus is
  // stranded on entry).
  React.useEffect(() => {
    if (!PlatformManager.isTV()) return;
    if (loading || streams.length === 0) return;
    const t = setTimeout(() => restoreFocusOrDefault(location.key || location.pathname, "STREAM_FIRST_ROW"), 80);
    return () => clearTimeout(t);
  }, [loading, streams.length, location.key, location.pathname]);

  const renderSidebar = () => {
    if (currentMedia) {
      return <StreamSidebar media={currentMedia} season={season} episode={episode} onBack={() => navigate(-1)} />;
    }
    return (
      <aside className="streams-page-sidebar skeleton-loading">
        <FocusableButton className="streams-sidebar-back-btn" onClick={() => navigate(-1)}><ArrowLeft size="1.125rem" /></FocusableButton>
        <div className="streams-sidebar-poster skeleton" style={{ height: "22.5rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.05)" }} />
      </aside>
    );
  };

  const renderContent = () => (
    <section className="streams-page-content" style={{ display: "flex", flexDirection: "column" }}>
      <div className="streams-scroll-area" data-tv-scroll="vertical">
        <StreamList
          streams={streams}
          loading={loading}
          showFilters={true}
          emptyText={error || undefined}
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
        onResetOverride={handleResetOverride}
        seasonMap={episodeSelectorData.seasonMap}
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
        <ShieldAlert size="3rem" className="media-not-found-icon" />
        <h2 className="media-not-found-title">{t("notFound.title")}</h2>
        <FocusableButton className="btn-glass" onClick={() => navigate(-1)}>{t("actions.back")}</FocusableButton>
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
            <span style={{ marginTop: "0.75rem", fontSize: "0.95rem", color: "#fff", fontWeight: 500 }}>
              {t("loading.fetchingInfo")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaStreamsPage;

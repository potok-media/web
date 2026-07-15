import React from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { StreamList } from "../components/common/StreamList";
import { StreamSidebar } from "../components/StreamSidebar";
import { EpisodeSelectorPopup } from "../components/common/EpisodeSelectorPopup";
import { useMediaStreams } from "../hooks/useMediaStreams";
import { usePlayback } from "../context/PlaybackContext";
import type { MediaCard } from "../network/ApiTypes";

import { Button, IconButton } from "../components/ui";

export const MediaStreamsPage: React.FC = () => {
  const { t } = useTranslation("streams");
  const { mediaType, id, tab } = useParams<{ mediaType: string; id: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { activePlayback } = usePlayback();

  const mediaId = Number(id);
  const state = location.state as { season?: number; episode?: number; media?: MediaCard } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;

  const {
    currentMedia,
    loadingMediaDetails,
    streams,
    loading,
    error,
    seasons,
    seasonsLoading,
    episodeSelectorData,
    clickedStream,
    handleSelectStream,
    handlePlayEpisode,
    handleClosePopup,
    handleRefresh,
    handleStartEditing,
    handleApplyOverride,
    handleResetOverride,
    handleApplyFileOverride,
    handleResetFileOverride,
    fileOverrideEnabled,
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
        <IconButton className="streams-sidebar-back-btn" onClick={() => navigate(-1)} aria-label={t("actions.back")}><ArrowLeft size="1.125rem" /></IconButton>
        <div className="streams-sidebar-poster skeleton skeleton--tall" />
      </aside>
    );
  };

  const renderContent = () => (
    <section className="streams-page-content">
      <div className="streams-scroll-area">
        <StreamList
          streams={streams}
          loading={loading}
          showFilters={true}
          emptyText={error || undefined}
          onSelectStream={handleSelectStream}
          onRefresh={handleRefresh}
          onBack={() => navigate(-1)}
        />
      </div>
    </section>
  );

  const renderPopup = () => {
    if (!episodeSelectorData || !clickedStream) return null;
    return (
      <EpisodeSelectorPopup
        // Hidden while the global player overlay is open (the popup is a body portal and would otherwise
        // paint over the z-index-free player); it reappears when the player closes.
        isOpen={!!episodeSelectorData && !activePlayback}
        onClose={handleClosePopup}
        title={episodeSelectorData.title}
        episodes={episodeSelectorData.episodes}
        onPlay={handlePlayEpisode}
        onStartEditing={handleStartEditing}
        onApplyOverride={handleApplyOverride}
        onResetOverride={handleResetOverride}
        fileOverrideEnabled={fileOverrideEnabled}
        fileMap={episodeSelectorData.fileMap}
        onApplyFileOverride={handleApplyFileOverride}
        onResetFileOverride={handleResetFileOverride}
        seasonMap={episodeSelectorData.seasonMap}
        seasons={seasons}
        seasonsLoading={seasonsLoading}
        isSaving={isSaving}
        tmdbSeasonsCount={episodeSelectorData.tmdbSeasonsCount}
        parsingSuspect={episodeSelectorData.parsingSuspect}
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
        <Button variant="glass" onClick={() => navigate(-1)}>{t("actions.back")}</Button>
      </div>
    );
  }

  return (
    <div className="streams-page-layout">
      <div
        className="streams-page-backdrop"
        style={{ "--backdrop-image": `url(${currentMedia?.backdropSrc || ""})` } as React.CSSProperties}
      />
      {renderSidebar()}
      {renderContent()}
      {renderPopup()}
      {actionLoading && (
        <div className="saving-overlay saving-overlay--fixed">
          <div className="saving-content">
            <div className="premium-spinner">
              <div className="spinner-outer" />
              <div className="spinner-inner" />
            </div>
            <span className="saving-overlay-message">
              {t("loading.fetchingInfo")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaStreamsPage;

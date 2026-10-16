import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, ListVideo, ShieldAlert } from "lucide-react";
import { StreamList } from "../components/common/StreamList";
import { StreamSidebar } from "../components/StreamSidebar";
import { TorrentFilesPanel } from "../components/TorrentFilesPanel";
import { WatchTogetherRail } from "../components/watchTogether/WatchTogetherRail";
import { useMediaStreams } from "../hooks/useMediaStreams";
import { usePlayback } from "../context/PlaybackContext";
import { useWatchTogether } from "../context/watchTogetherState";
import { usePlayerPlaylist } from "../hooks/usePlayerPlaylist";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { MediaCard } from "../network/ApiTypes";

import { Button, IconButton } from "../components/ui";

export const MediaStreamsPage: React.FC = () => {
  const { t } = useTranslation("streams");
  const { mediaType, id, tab } = useParams<{ mediaType: string; id: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { activePlayback, playVideo, registerPlayerPortalTarget } = usePlayback();
  const watchTogether = useWatchTogether();
  const playPlaylistItem = usePlayerPlaylist(activePlayback, playVideo);
  const mediaStageRef = useRef<HTMLDivElement>(null);

  const mediaId = Number(id);
  const state = location.state as {
    season?: number; episode?: number; media?: MediaCard;
    workId?: string; entryId?: string; episodeId?: string;
  } | null;
  const season = state?.season ?? (searchParams.get("season") ? Number(searchParams.get("season")) : undefined);
  const episode = state?.episode ?? (searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined);
  const initialMedia = state?.media;
  const workId = state?.workId || searchParams.get("workId") || undefined;
  const entryId = state?.entryId || searchParams.get("entryId") || undefined;
  const episodeId = state?.episodeId || searchParams.get("episodeId") || undefined;

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
    searchStartedAt,
    searchTimeoutMs,
    handleStartEditing,
    handleApplyOverride,
    handleResetOverride,
    handleApplyFileOverride,
    handleResetFileOverride,
    handleApplyEpisodeBinding,
    armLayout,
    armLayoutLoading,
    armLayoutError,
    lastSelected,
    fileOverrideEnabled,
    isSaving,
    actionLoading,
  } = useMediaStreams({
    mediaType,
    mediaId,
    season,
    episode,
    workId,
    entryId,
    episodeId,
    initialMedia,
    activeTab: tab,
  });
  const showTorrentFiles = Boolean(clickedStream);
  const showCoWatchRail = Boolean(watchTogether.role);
  // File discovery has its own screen. Do not mount a player surface until the file list is known.
  const showRightRail = (showTorrentFiles && Boolean(episodeSelectorData)) || showCoWatchRail;
  const inlinePlaybackActive = Boolean(activePlayback && (activePlayback.presentation !== "fullscreen" || showCoWatchRail));
  const activeEpisodeId = activePlayback?.playlist?.[activePlayback.playlistIndex ?? -1]?.id;
  const workspaceMode = showRightRail;
  const stageMode = inlinePlaybackActive ? "player" : "preview";

  const handleQueuePlay = (episodeItem: GenericEpisodeItem) => {
    if (watchTogether.role && watchTogether.sessionActive && activePlayback?.playlist) {
      const playlistIndex = activePlayback.playlist.findIndex((item) =>
        item.id && episodeItem.id
          ? String(item.id) === String(episodeItem.id)
          : item.season === episodeItem.season && item.episode === episodeItem.episode,
      );
      if (playlistIndex >= 0) {
        if (watchTogether.role === "guest") {
          if (watchTogether.myPermissions.canControl) {
            watchTogether.sendControl("episode", undefined, playlistIndex);
          }
        } else {
          void playPlaylistItem(playlistIndex);
        }
        return;
      }
    }
    handlePlayEpisode(episodeItem);
  };

  useEffect(() => {
    if (!inlinePlaybackActive) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    mediaStageRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [activePlayback?.instanceId, inlinePlaybackActive]);

  const renderSidebar = () => {
    if (currentMedia) {
      return <StreamSidebar media={currentMedia} onBack={() => navigate(-1)} />;
    }
    return (
      <aside className="streams-page-sidebar skeleton-loading">
        <IconButton
          className="streams-sidebar-back-btn"
          onClick={() => navigate(-1)}
          aria-label={t("actions.back")}
        >
          <ArrowLeft size="1.125rem" />
        </IconButton>
        <div className="streams-sidebar-poster skeleton skeleton--tall" />
      </aside>
    );
  };

  const renderTorrentList = (withResponsiveBack = false) => (
    <StreamList
      streams={streams}
      loading={loading}
      showFilters={true}
      emptyText={error || undefined}
      onSelectStream={handleSelectStream}
      onRefresh={handleRefresh}
      onBack={withResponsiveBack ? () => navigate(-1) : undefined}
      isSearching={loading}
      searchStartedAt={searchStartedAt}
      searchTimeoutMs={searchTimeoutMs}
      lastSelected={lastSelected}
    />
  );

  const renderPlayerPreview = () => (
    <div className="streams-player-preview">
      <div
        className="streams-player-preview__artwork"
        style={{ backgroundImage: `url(${currentMedia?.backdropSrc || ""})` }}
      />
      <div className="streams-player-preview__veil" />
      <div className="streams-player-preview__content">
        <ListVideo size="2rem" />
        <strong>{t("media:streams.episodeSelection")}</strong>
        {episodeSelectorData?.parsingSuspect ? (
          <span>{t("media:selector.parsingHintBody")}</span>
        ) : null}
      </div>
    </div>
  );

  const renderTorrentFiles = () => (
    <TorrentFilesPanel
      loading={!episodeSelectorData}
      loadingLabel={t("loading.fetchingInfo")}
      backLabel={t("actions.back")}
      busy={actionLoading && Boolean(episodeSelectorData)}
      onClose={handleClosePopup}
      title={episodeSelectorData?.title || clickedStream?.title || ""}
      episodes={episodeSelectorData?.episodes || []}
      onPlay={handleQueuePlay}
      onStartEditing={handleStartEditing}
      onApplyOverride={handleApplyOverride}
      onResetOverride={handleResetOverride}
      fileOverrideEnabled={fileOverrideEnabled}
      fileMap={episodeSelectorData?.fileMap || {}}
      onApplyFileOverride={handleApplyFileOverride}
      onResetFileOverride={handleResetFileOverride}
      onApplyEpisodeBinding={handleApplyEpisodeBinding}
      armLayout={armLayout}
      armLayoutLoading={armLayoutLoading}
      armLayoutError={armLayoutError}
      onRetryArmLayout={handleStartEditing}
      seasonMap={episodeSelectorData?.seasonMap || {}}
      seasons={seasons}
      seasonsLoading={seasonsLoading}
      isSaving={isSaving}
      tmdbSeasonsCount={episodeSelectorData?.tmdbSeasonsCount}
      parsingSuspect={episodeSelectorData?.parsingSuspect}
      backdropSrc={currentMedia?.backdropSrc}
      posterSrc={currentMedia?.posterSrc}
      mediaType={mediaType}
      activeEpisodeId={activeEpisodeId}
    />
  );

  const renderContent = () => (
    <section className="streams-page-content">
      <div className="torrents-panel" hidden={showRightRail}>
        {renderTorrentList()}
      </div>

      {showTorrentFiles && renderTorrentFiles()}

      {!showTorrentFiles && showCoWatchRail && (
        <section className="torrent-files-panel torrent-files-panel--co-watch">
          <WatchTogetherRail
            queueCount={activePlayback ? 1 : 0}
            queue={(
              <div className="wt-queue-current">
                <ListVideo size="1.5rem" />
                <div>
                  <span>{t("watchTogether:queue")}</span>
                  <strong>{activePlayback?.title || currentMedia?.title || ""}</strong>
                </div>
              </div>
            )}
          />
        </section>
      )}
    </section>
  );

  if (!loadingMediaDetails && !currentMedia) {
    return (
      <div className="media-not-found-container">
        <ShieldAlert size="3rem" className="media-not-found-icon" />
        <h2 className="media-not-found-title">{t("notFound.title")}</h2>
        <Button variant="glass" onClick={() => navigate(-1)}>{t("actions.back")}</Button>
      </div>
    );
  }

  // Keep the stage and its portal target mounted when a solo player becomes a room host.
  return (
    <div className={`streams-page-layout ${workspaceMode ? "" : "streams-page-layout--browser"}`}>
      <div
        className="streams-page-backdrop"
        style={{ "--backdrop-image": `url(${currentMedia?.backdropSrc || ""})` } as React.CSSProperties}
      />
      <div
        className={`streams-page-shell ${workspaceMode ? "streams-page-shell--workspace" : "streams-page-shell--browser"} ${showRightRail ? "streams-page-shell--split" : ""}`}
      >
        {workspaceMode ? (
          <div className={`streams-inline-workspace ${showRightRail ? "streams-inline-workspace--split" : ""}`}>
            <div
              ref={mediaStageRef}
              className={`streams-media-stage streams-media-stage--${stageMode}`}
            >
              <div ref={registerPlayerPortalTarget} className="streams-media-stage__surface">
                {stageMode === "preview" ? renderPlayerPreview() : null}
              {stageMode === "preview" && clickedStream?.title ? (
                  <div className="streams-media-stage__release-title" title={clickedStream.title}>
                    {clickedStream.title}
                  </div>
                ) : null}
              </div>
            </div>
            {renderContent()}
          </div>
        ) : (
          <div className="streams-browser-layout">
            {renderSidebar()}
            <section className="streams-page-content streams-page-content--browser">
              <div className="streams-scroll-area">
                {showTorrentFiles ? renderTorrentFiles() : renderTorrentList(true)}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaStreamsPage;

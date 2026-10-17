import React, { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, ListVideo, ShieldAlert } from "lucide-react";
import { StreamList } from "../components/common/StreamList";
import { StreamSidebar } from "../components/StreamSidebar";
import { TorrentFilesPanel } from "../components/TorrentFilesPanel";
import { PlaybackWorkspace } from "../components/playback/PlaybackWorkspace";
import { useMediaStreams } from "../hooks/useMediaStreams";
import { usePlayback } from "../context/PlaybackContext";
import { useWatchTogether } from "../context/watchTogetherState";
import { usePlayerPlaylist } from "../hooks/usePlayerPlaylist";
import type { GenericEpisodeItem } from "../components/common/episodeSelector/types";
import type { MediaCard } from "../network/ApiTypes";
import { orderItemsByIds, reorderPlaylistKeepingCurrent } from "../utils/queueOrder";

import { Button, IconButton } from "../components/ui";

export const MediaStreamsPage: React.FC = () => {
  const { t } = useTranslation("streams");
  const { mediaType, id, tab } = useParams<{ mediaType: string; id: string; tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { activePlayback, playVideo, replacePlaylist } = usePlayback();
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
    releasePlaybackPhase,
    releasePlaybackMode,
    releasePlaybackError,
    playbackBlocked,
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
  const showTorrentFiles = releasePlaybackMode === "files" && releasePlaybackPhase !== "browsing";
  const showCoWatchRail = Boolean(
    activePlayback && watchTogether.role && watchTogether.sessionActive,
  );
  const showRightRail = showTorrentFiles || showCoWatchRail;
  const inlinePlaybackActive = Boolean(activePlayback);
  const activeEpisodeId = activePlayback?.playlist?.[activePlayback.playlistIndex ?? -1]?.id;
  const displayedEpisodes = useMemo(() => {
    const episodes = episodeSelectorData?.episodes || [];
    const playlistIds = activePlayback?.playlist?.flatMap((item) => item.id ? [String(item.id)] : []) || [];
    return playlistIds.length > 0 ? orderItemsByIds(episodes, playlistIds) : episodes;
  }, [activePlayback?.playlist, episodeSelectorData?.episodes]);
  const coWatchQueueCount = showTorrentFiles
    ? displayedEpisodes.length
    : activePlayback?.playlist?.length || (activePlayback ? 1 : 0);
  const workspaceMode = releasePlaybackPhase !== "browsing" || inlinePlaybackActive || showCoWatchRail;
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

  const handleReorderEpisodes = (episodes: GenericEpisodeItem[]) => {
    if (!activePlayback?.playlist) return;
    const reordered = reorderPlaylistKeepingCurrent(
      activePlayback.playlist,
      episodes.map((item) => item.id),
      activePlayback.playlistIndex ?? 0,
    );
    replacePlaylist(reordered.playlist, reordered.playlistIndex);
    if (watchTogether.role === "host" && watchTogether.sessionActive) {
      watchTogether.hostUpdateQueue(reordered.playlist, reordered.playlistIndex);
    }
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
        <strong>{releasePlaybackMode === "direct" && clickedStream?.title
          ? clickedStream.title
          : t("media:streams.episodeSelection")}</strong>
        {releasePlaybackError ? (
          <span>{releasePlaybackError}</span>
        ) : episodeSelectorData?.parsingSuspect ? (
          <span>{t("media:selector.parsingHintBody")}</span>
        ) : releasePlaybackPhase === "preparing" ? (
          <span>{t("loading.fetchingInfo")}</span>
        ) : null}
      </div>
    </div>
  );

  const renderTorrentFiles = () => (
    <TorrentFilesPanel
      loading={releasePlaybackPhase === "inspecting"}
      loadingLabel={t("loading.fetchingInfo")}
      backLabel={inlinePlaybackActive ? t("media:selector.closePlayback") : t("actions.back")}
      navigationAction={inlinePlaybackActive ? "close" : "back"}
      busy={releasePlaybackPhase === "preparing" && Boolean(episodeSelectorData)}
      error={!episodeSelectorData ? releasePlaybackError : null}
      onClose={handleClosePopup}
      title={episodeSelectorData?.title || clickedStream?.title || ""}
      episodes={displayedEpisodes}
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
      hideHeader={showCoWatchRail}
      playbackBlocked={playbackBlocked}
      playbackBlockReason={playbackBlocked ? t("media:selector.parsingHintBody") : undefined}
      canReorder={watchTogether.role !== "guest"}
      onReorderEpisodes={handleReorderEpisodes}
    />
  );

  const renderCoWatchQueue = () => showTorrentFiles ? renderTorrentFiles() : (
    <div className="wt-queue-current">
      <ListVideo size="1.5rem" />
      <div>
        <span>{t("watchTogether:queue")}</span>
        <strong>{activePlayback?.title || currentMedia?.title || ""}</strong>
      </div>
    </div>
  );

  const renderContent = () => (
    <section className="streams-page-content">
      <div className="torrents-panel" hidden={showRightRail}>
        {renderTorrentList()}
      </div>

      {showTorrentFiles && renderTorrentFiles()}
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
  if (workspaceMode) {
    const stageContent = stageMode === "preview" ? (
      <>
        {renderPlayerPreview()}
        {clickedStream?.title ? (
          <div className="streams-media-stage__release-title" title={clickedStream.title}>
            {clickedStream.title}
          </div>
        ) : null}
      </>
    ) : null;

    return (
      <PlaybackWorkspace
        backdropSrc={currentMedia?.backdropSrc}
        stageMode={stageMode}
        stageContent={stageContent}
        mediaStageRef={mediaStageRef}
        rail={showRightRail ? renderContent() : undefined}
        coWatchQueue={showCoWatchRail ? renderCoWatchQueue() : undefined}
        coWatchQueueCount={coWatchQueueCount}
      />
    );
  }

  return (
    <div className="streams-page-layout streams-page-layout--browser">
      <div
        className="streams-page-backdrop"
        style={{ "--backdrop-image": `url(${currentMedia?.backdropSrc || ""})` } as React.CSSProperties}
      />
      <div className="streams-page-shell streams-page-shell--browser">
        <div className="streams-browser-layout">
          {renderSidebar()}
          <section className="streams-page-content streams-page-content--browser">
            <div className="streams-scroll-area">
              {showTorrentFiles ? renderTorrentFiles() : renderTorrentList(true)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MediaStreamsPage;

import React, { useCallback, useState, useRef, useEffect } from "react";
import type { TorrentSearchResult, TorrentFileItem, MediaCard } from "../network/ApiTypes";
import { useAppSettings } from "../context/AppSettingsContext";
import { useHUD } from "../context/HUDContext";
import TorrentOverridePicker from "./TorrentOverridePicker";
import TorrentFileRow from "./TorrentFileRow";
import TorrentFilesHeader from "./TorrentFilesHeader";
import { playTorrentFile } from "../utils/PlaybackManager";
import { useTorrentFiles } from "../hooks/useTorrentFiles";

interface TorrentFilesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  torrent: TorrentSearchResult;
  mediaItem: MediaCard;
  seasonNumber?: number;
  episodeNumber?: number;
}

export const TorrentFilesPopup: React.FC<TorrentFilesPopupProps> = ({
  isOpen,
  onClose,
  torrent,
  mediaItem,
}) => {
  const { defaultPlayer, playVideo } = useAppSettings();
  const { show: showHUD } = useHUD();

  const {
    files,
    loading,
    isEditing,
    setIsEditing,
    seasons,
    seasonsLoading,
    isSaving,
    episodeMetadata,
    loadingMetadata,
    handleStartEditing,
    handleApplyOverride,
  } = useTorrentFiles({
    torrent,
    mediaItem,
    isOpen,
    onClose,
    showHUD,
  });

  const [visibleCount, setVisibleCount] = useState(25);
  const listSentinelRef = useRef<HTMLDivElement>(null);

  // Stabilize callbacks to prevent child component re-renders
  const playParamsRef = useRef({ defaultPlayer, torrent, mediaItem, showHUD, playVideo });
  useEffect(() => {
    playParamsRef.current = { defaultPlayer, torrent, mediaItem, showHUD, playVideo };
  }, [defaultPlayer, torrent, mediaItem, showHUD, playVideo]);

  // Fast O(1) set lookup for watched episodes
  const watchedSet = React.useMemo(() => {
    const progress = mediaItem.progress;
    if (!progress || !progress.watchedEpisodes) return new Set<string>();
    return new Set<string>(
      progress.watchedEpisodes.map((we) => `${we.season}:${we.number}`)
    );
  }, [mediaItem.progress]);

  useEffect(() => {
    setVisibleCount(25);
  }, [torrent.id, torrent.magnetUri]);

  useEffect(() => {
    const sentinel = listSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 25);
      }
    });

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [visibleCount, files.length]);

  const handlePlayFile = useCallback(async (file: TorrentFileItem) => {
    const { defaultPlayer, torrent, mediaItem, showHUD, playVideo } = playParamsRef.current;
    try {
      await playTorrentFile({
        defaultPlayer,
        torrent,
        file,
        mediaItem,
        showHUD,
        playVideo,
      });
    } catch (err) {
      console.error("[TorrentFilesPopup] Failed to play torrent file:", err);
      showHUD("error", "Ошибка запуска стрима");
    }
  }, []);

  const checkWatched = useCallback((file: TorrentFileItem) => {
    const progress = mediaItem.progress;
    if (!progress) return false;
    if (mediaItem.mediaType === "movie") {
      return progress.completed > 0;
    } else {
      if (file.season === undefined || file.season === null || file.episode === undefined || file.episode === null) return false;
      return watchedSet.has(`${file.season}:${file.episode}`);
    }
  }, [mediaItem.progress, mediaItem.mediaType, watchedSet]);

  if (!isOpen) return null;

  const parsingFailed =
    mediaItem.mediaType === "tv" &&
    files.some((f) => f.season === undefined || f.season === null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: isEditing ? "1000px" : "850px" }}
      >
        <TorrentFilesHeader
          isEditing={isEditing}
          onClose={onClose}
          onBackToFiles={() => setIsEditing(false)}
          torrent={torrent}
          mediaItem={mediaItem}
          parsingFailed={parsingFailed}
          loading={loading}
          filesLength={files.length}
          onStartEditing={handleStartEditing}
        />

        <div className="torrent-popup-body">
          {isEditing ? (
            <TorrentOverridePicker
              seasons={seasons}
              seasonsLoading={seasonsLoading}
              onApplyOverride={handleApplyOverride}
            />
          ) : (
            <div className="files-list-container">
              {loading || loadingMetadata ? (
                <div className="torrent-popup-loading-container">
                  <div className="spinner" />
                </div>
              ) : files.length > 0 ? (
                <div className="torrent-popup-rows-list">
                  {files.slice(0, visibleCount).map((file) => (
                    <TorrentFileRow
                      key={file.id}
                      file={file}
                      metadata={(file.season !== undefined && file.season !== null && file.episode !== undefined && file.episode !== null) ? episodeMetadata[`${file.season}:${file.episode}`] : null}
                      mediaItem={mediaItem}
                      isWatched={checkWatched(file)}
                      onPlay={handlePlayFile}
                    />
                  ))}
                  {visibleCount < files.length && (
                    <div ref={listSentinelRef} style={{ height: "1px" }} />
                  )}
                </div>
              ) : (
                <div className="torrent-popup-empty-files">
                  Нет поддерживаемых видеофайлов в раздаче.
                </div>
              )}
            </div>
          )}

          {/* Saving Blur Overlay */}
          {isSaving && (
            <div className="saving-overlay">
              <div className="saving-content">
                <div className="spinner" />
                <span>Сохранение...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TorrentFilesPopup;

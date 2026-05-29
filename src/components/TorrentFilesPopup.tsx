import React from "react";
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
  const { defaultPlayer } = useAppSettings();
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

  const handlePlayFile = async (file: TorrentFileItem) => {
    try {
      await playTorrentFile({
        defaultPlayer,
        torrent,
        file,
        mediaItem,
        showHUD,
      });
    } catch {
      showHUD("error", "Ошибка запуска стрима");
    }
  };

  const checkWatched = (file: TorrentFileItem) => {
    const progress = mediaItem.progress;
    if (!progress) return false;
    if (mediaItem.mediaType === "movie") {
      return progress.completed > 0;
    } else {
      if (file.season === undefined || file.season === null || file.episode === undefined || file.episode === null) return false;
      return (progress.watchedEpisodes || []).some(
        (we) => we.season === file.season && we.number === file.episode
      );
    }
  };

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
                  {files.map((file) => (
                    <TorrentFileRow
                      key={file.id}
                      file={file}
                      metadata={file.season && file.episode ? episodeMetadata[`${file.season}:${file.episode}`] : null}
                      mediaItem={mediaItem}
                      isWatched={checkWatched(file)}
                      onPlay={handlePlayFile}
                    />
                  ))}
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

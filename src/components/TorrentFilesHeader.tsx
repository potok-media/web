import React from "react";
import { ArrowLeft, Pencil, CheckCircle2 } from "lucide-react";
import type { TorrentSearchResult, MediaCard } from "../network/ApiClient";

interface TorrentFilesHeaderProps {
  isEditing: boolean;
  onClose: () => void;
  onBackToFiles: () => void;
  torrent: TorrentSearchResult;
  mediaItem: MediaCard;
  parsingFailed: boolean;
  loading: boolean;
  filesLength: number;
  onStartEditing: () => void;
}

export const TorrentFilesHeader: React.FC<TorrentFilesHeaderProps> = React.memo(({
  isEditing,
  onClose,
  onBackToFiles,
  torrent,
  mediaItem,
  parsingFailed,
  loading,
  filesLength,
  onStartEditing,
}) => {
  const handleBackOrClose = isEditing ? onBackToFiles : onClose;

  return (
    <div className="modal-header">
      <div className="modal-title-row">
        <button className="modal-close-btn" onClick={handleBackOrClose}>
          <ArrowLeft size={20} />
        </button>
        <div className="modal-title-text-group">
          <h3 className="modal-title modal-title-custom-size">Файлы раздачи</h3>
          <span className="modal-subtitle modal-subtitle-text">
            {torrent.title}
          </span>
          
          {mediaItem.mediaType === "tv" && mediaItem.progress && mediaItem.progress.aired > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size={12} fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>
                Просмотрено серий: {mediaItem.progress.completed} из {mediaItem.progress.aired} ({Math.round(mediaItem.progress.percentage)}%)
              </span>
            </div>
          )}

          {mediaItem.mediaType === "movie" && mediaItem.progress && mediaItem.progress.completed > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size={12} fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>Просмотрено</span>
            </div>
          )}
        </div>
      </div>

      <div className="modal-header-actions-row">
        {parsingFailed && !loading && !isEditing && (
          <div className="parsing-hint-banner">
            Не удалось распарсить сезон? <br />
            Возможно, понадобится указать номер серии для корректного отслеживания.
          </div>
        )}

        {mediaItem.mediaType === "tv" && !isEditing && filesLength > 0 && !loading && (
          <button className="edit-btn" onClick={onStartEditing}>
            <Pencil size={14} />
            <span>Править</span>
          </button>
        )}

        <button className="close-btn" onClick={handleBackOrClose}>
          {isEditing ? "Назад" : "Закрыть"}
        </button>
      </div>
    </div>
  );
});

TorrentFilesHeader.displayName = "TorrentFilesHeader";
export default TorrentFilesHeader;

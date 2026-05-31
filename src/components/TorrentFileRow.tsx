import React from "react";
import { Play, CheckCircle2 } from "lucide-react";
import type { TorrentFileItem, MediaCard } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";

interface TorrentFileRowProps {
  file: TorrentFileItem;
  metadata: TvEpisode | null;
  mediaItem: MediaCard;
  isWatched: boolean;
  onPlay: (file: TorrentFileItem) => void;
}

export const TorrentFileRow: React.FC<TorrentFileRowProps> = React.memo(({
  file,
  metadata,
  mediaItem,
  isWatched,
  onPlay,
}) => {
  const isMovie = mediaItem.mediaType === "movie";
  const showBanner = file.isSerial || isMovie;
  
  const displayTitle = metadata?.name || file.title || file.path?.split("/").pop() || "";
  
  let displaySubtitle = "";
  if (file.season !== undefined && file.season !== null && file.episode !== undefined && file.episode !== null) {
    displaySubtitle = `Сезон ${file.season} • Серия ${file.episode}`;
    if (metadata?.airDate) {
      try {
        const airDateStr = new Date(metadata.airDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
        displaySubtitle += ` • ${airDateStr}`;
      } catch (e) {
        console.warn("Failed to parse airDate:", metadata.airDate, e);
      }
    }
  } else {
    displaySubtitle = file.folderName || "";
  }

  const imageUrl = metadata?.stillPath || metadata?.still_path || mediaItem.backdropSrc || mediaItem.posterSrc;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(file);
  };

  return (
    <div
      className="file-card-row"
      onClick={() => onPlay(file)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay(file);
        }
      }}
    >
      {showBanner && (
        <div className="file-card-banner">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayTitle}
              className="file-card-image"
              loading="lazy"
            />
          ) : (
            <div className="file-card-preview-placeholder" />
          )}
          <div className="file-card-banner-overlay" />
          {file.episode && file.episode > 0 && (
            <span className="file-card-bg-number">{file.episode}</span>
          )}
          {isWatched && (
            <div className="file-card-badge-checked">
              <CheckCircle2 size={20} fill="var(--accent)" stroke="var(--bg-surface)" />
            </div>
          )}
        </div>
      )}

      <div className="file-card-info-panel">
        <h4 className="file-card-title">{displayTitle}</h4>
        {displaySubtitle && displaySubtitle !== displayTitle && (
          <span className="file-card-subtitle">{displaySubtitle}</span>
        )}
      </div>

      <div className="file-card-details-panel">
        {isWatched && (
          <div className="file-card-watched-badge">
            <CheckCircle2 size={11} fill="var(--accent)" stroke="var(--accent-dim)" />
            <span>Просмотрено</span>
          </div>
        )}
        {file.sizeLabel && <span className="file-card-size">{file.sizeLabel}</span>}
        {file.extension && (
          <span className="file-card-ext-badge">
            {file.extension.replace(/^\./, "")}
          </span>
        )}
      </div>

      <button className="file-card-play-btn" onClick={handlePlayClick}>
        <Play size={16} fill="currentColor" className="file-card-play-icon-fix" />
      </button>
    </div>
  );
});

TorrentFileRow.displayName = "TorrentFileRow";
export default TorrentFileRow;

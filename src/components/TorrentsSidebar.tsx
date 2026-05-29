import React from "react";
import { ArrowLeft, Star } from "lucide-react";
import type { MediaCard } from "../network/ApiClient";

interface TorrentsSidebarProps {
  media: MediaCard;
  season?: number;
  episode?: number;
  onBack: () => void;
}

export const TorrentsSidebar: React.FC<TorrentsSidebarProps> = React.memo(({
  media,
  season,
  episode,
  onBack,
}) => {
  return (
    <aside className="torrents-page-sidebar">
      <button 
        className="torrents-sidebar-back-btn" 
        onClick={onBack} 
        title="Назад"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="torrents-sidebar-poster">
        <img src={media.posterSrc || ""} alt={media.title} />
      </div>

      <h2 className="torrents-sidebar-title">{media.title}</h2>
      {media.originalTitle && (
        <p className="torrents-sidebar-subtitle">{media.originalTitle}</p>
      )}
      
      <div className="torrents-sidebar-badges">
        {media.imdbRating && (
          <span className="rating-badge">
            <Star size={12} fill="white" />
            <span>{media.imdbRating.toFixed(1)}</span>
          </span>
        )}
        {media.kpRating && (
          <span className="kp-rating-badge">КП {media.kpRating.toFixed(1)}</span>
        )}
        {media.ageRating && (
          <span className="media-glass-pill age-pill">{media.ageRating}</span>
        )}
      </div>

      {media.mediaType === "tv" && season && (
        <span className="media-glass-pill active-episode-badge">
          Сезон {season}, Серия {episode}
        </span>
      )}

      {media.overview && (
        <div className="torrents-sidebar-overview">
          {media.overview}
        </div>
      )}
    </aside>
  );
});

TorrentsSidebar.displayName = "TorrentsSidebar";
export default TorrentsSidebar;

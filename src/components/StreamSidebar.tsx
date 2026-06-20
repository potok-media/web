import React from "react";
import { ArrowLeft, Star } from "lucide-react";
import type { MediaCard } from "../network/ApiClient";
import { FocusableButton } from "./common/TVNavigation";

interface StreamSidebarProps {
  media: MediaCard;
  season?: number;
  episode?: number;
  onBack: () => void;
}

export const StreamSidebar: React.FC<StreamSidebarProps> = React.memo(({
  media,
  onBack,
}) => {
  return (
    <aside className="streams-page-sidebar">
      <FocusableButton 
        className="streams-sidebar-back-btn" 
        onClick={onBack} 
        title="Назад"
      >
        <ArrowLeft size="1.125rem" />
      </FocusableButton>

      <div className="streams-sidebar-poster">
        <img src={media.posterSrc || ""} alt={media.title} />
      </div>

      <h2 className="streams-sidebar-title">{media.title}</h2>
      {media.originalTitle && (
        <p className="streams-sidebar-subtitle">{media.originalTitle}</p>
      )}
      
      <div className="streams-sidebar-badges">
        {media.imdbRating && (
          <span className="rating-badge">
            <Star size="0.75rem" fill="white" />
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

      {media.overview && (
        <div className="streams-sidebar-overview">
          {media.overview}
        </div>
      )}
    </aside>
  );
});

StreamSidebar.displayName = "StreamSidebar";
export default StreamSidebar;

import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Star } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { IconButton } from "./ui";

interface StreamSidebarProps {
  media: MediaCard;
  onBack: () => void;
}

export const StreamSidebar: React.FC<StreamSidebarProps> = React.memo(({
  media,
  onBack,
}) => {
  const { t } = useTranslation("streams");

  return (
    <aside className="streams-page-sidebar">
      <IconButton
        className="streams-sidebar-back-btn"
        onClick={onBack}
        title={t("actions.back")}
        aria-label={t("actions.back")}
      >
        <ArrowLeft size="1.125rem" />
      </IconButton>

      <div className="streams-sidebar-poster">
        <img src={media.posterSrc || ""} alt={media.title} />
      </div>

      <h1 className="streams-sidebar-title">{media.title}</h1>
      {media.originalTitle ? (
        <p className="streams-sidebar-subtitle">{media.originalTitle}</p>
      ) : null}

      <div className="streams-sidebar-badges">
        {media.imdbRating ? (
          <span className="rating-badge">
            <Star size="0.75rem" fill="currentColor" />
            <span>{media.imdbRating.toFixed(1)}</span>
          </span>
        ) : null}
        {media.kpRating ? (
          <span className="kp-rating-badge">КП {media.kpRating.toFixed(1)}</span>
        ) : null}
        {media.ageRating ? (
          <span className="media-glass-pill age-pill">{media.ageRating}</span>
        ) : null}
      </div>

      {media.overview ? (
        <p className="streams-sidebar-overview">{media.overview}</p>
      ) : null}
    </aside>
  );
});

StreamSidebar.displayName = "StreamSidebar";

export default StreamSidebar;

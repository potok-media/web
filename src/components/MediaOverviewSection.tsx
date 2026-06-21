import React from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import type { TvEpisode, MediaCard } from "../network/ApiTypes";

interface MediaOverviewSectionProps {
  media: MediaCard;
  selectedEpisode: {
    episode: TvEpisode;
    seasonNumber: number;
  } | null;
  setSelectedEpisode: (val: any) => void;
}

export const MediaOverviewSection: React.FC<MediaOverviewSectionProps> = ({
  media,
  selectedEpisode,
  setSelectedEpisode,
}) => {
  const { t } = useTranslation("media");

  if (selectedEpisode) {
    return (
      <div className="details-main-info selected-episode-mode">
        {media.originalTitle && <p className="details-subtitles">{media.originalTitle}</p>}

        <h2 className="details-episode-title">
          S{selectedEpisode.seasonNumber} • E{selectedEpisode.episode.episodeNumber} — {selectedEpisode.episode.name || t("episode.fallbackName", { number: selectedEpisode.episode.episodeNumber })}
        </h2>

        <div className="hero-metadata details-hero-metadata">
          {selectedEpisode.episode.airDate && (
            <span>{selectedEpisode.episode.airDate}</span>
          )}
          <span>• 1080p</span>
          {media.genres && <span>• {media.genres}</span>}
        </div>

        <p className="details-overview-text">
          {selectedEpisode.episode.overview || media.overview || t("episode.noOverview")}
        </p>

        <button 
          className="details-reset-episode-btn"
          onClick={() => setSelectedEpisode(null)}
        >
          ← {t("episode.backToShow")}
        </button>
      </div>
    );
  }

  return (
    <div className="details-main-info">
      {media.originalTitle && <p className="details-subtitles">{media.originalTitle}</p>}

      <div className="hero-metadata details-hero-metadata">
        {media.studioLogoSrc && (
          <img src={media.studioLogoSrc} className="details-studio-logo" alt="Studio" />
        )}
        {media.subtitle && <span className="details-metadata-subtitle">{media.subtitle}</span>}
        {media.genres && <span>• {media.genres}</span>}
        {media.ageRating && <span>• {media.ageRating}</span>}
        {media.numberOfSeasons && <span>• {t("overview.seasonsCount", { count: media.numberOfSeasons })}</span>}
      </div>

      {media.overview && (
        <p className="details-overview-text">{media.overview}</p>
      )}

      <div className="details-rating-container">
        {media.imdbRating && (
          <span className="rating-badge details-rating-badge">
            <Star size="0.75rem" fill="white" />
            <span>IMDb {media.imdbRating.toFixed(1)}</span>
          </span>
        )}
        {media.kpRating && (
          <span className="kp-rating-badge details-rating-badge">
            <span>КП {media.kpRating.toFixed(1)}</span>
          </span>
        )}
      </div>
    </div>
  );
};
export default MediaOverviewSection;

import React from "react";
import { useTranslation } from "react-i18next";
import { Star, Eye, Bookmark } from "lucide-react";
import { IconButton } from "../ui";
import { Slot } from "../common/extension/Slot";
import { MediaOverviewSection } from "../MediaOverviewSection";
import type { MediaCard, TvEpisode } from "../../network/ApiTypes";

interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
}

interface MediaDetailsHeroSectionProps {
  media: MediaCard;
  mediaId: number;
  tmdbId: number;
  mediaType?: string;
  selectedEpisode: SelectedEpisodeState | null;
  setSelectedEpisode: (value: SelectedEpisodeState | null) => void;
  isWatched: boolean;
  inWatchlist: boolean;
  isFavorite: boolean;
  toggleWatched: () => void;
  toggleWatchlist: () => void;
  toggleFavorite: () => void;
}

export const MediaDetailsHeroSection: React.FC<MediaDetailsHeroSectionProps> = ({
  media,
  mediaId,
  tmdbId,
  mediaType,
  selectedEpisode,
  setSelectedEpisode,
  isWatched,
  inWatchlist,
  isFavorite,
  toggleWatched,
  toggleWatchlist,
  toggleFavorite,
}) => {
  const { t } = useTranslation("media");

  return (
    <div className="immersive-hero-container">
        {media.backdropSrc && (
          <img
            src={media.backdropSrc}
            className="immersive-hero-backdrop details-hero-backdrop"
            alt=""
            decoding="async"
            onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
          />
        )}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          <div className="details-content-container">
            <div className="details-poster-sidebar">
              {media.logoSrc ? (
                <div className="details-logo-container">
                  <img src={media.logoSrc} className="details-logo" alt={media.title} />
                </div>
              ) : (
                <h1 className="details-title-fallback">{media.title}</h1>
              )}

              <div className="details-actions-container">
                <Slot
                  name="media-actions"
                  props={{
                    mediaId,
                    tmdbId,
                    mediaType,
                    title: media.title,
                    originalTitle: media.originalTitle,
                    media,
                    season: selectedEpisode?.seasonNumber,
                    episode: selectedEpisode?.episode.episodeNumber,
                  }}
                />

                <div id="social-actions-row" className="details-actions-row">
                  <IconButton
                    className={`action-btn-circle ${isWatched ? "active" : ""}`}
                    onClick={toggleWatched}
                    title={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                    aria-label={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                  >
                    <Eye size="1.125rem" />
                  </IconButton>

                  <IconButton
                    className={`action-btn-circle ${inWatchlist ? "active" : ""}`}
                    onClick={toggleWatchlist}
                    title={inWatchlist ? t("details.removeFromWatchlist") : t("details.addToWatchlist")}
                    aria-label={inWatchlist ? t("details.removeFromWatchlist") : t("details.addToWatchlist")}
                  >
                    <Bookmark size="1.125rem" fill={inWatchlist ? "var(--accent)" : "none"} />
                  </IconButton>

                  <IconButton
                    className={`action-btn-circle ${isFavorite ? "active" : ""}`}
                    onClick={toggleFavorite}
                    title={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                    aria-label={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                  >
                    <Star size="1.125rem" fill={isFavorite ? "var(--accent)" : "none"} />
                  </IconButton>
                </div>
              </div>
            </div>

            <MediaOverviewSection
              media={media}
              selectedEpisode={selectedEpisode}
              setSelectedEpisode={setSelectedEpisode}
            />
          </div>
        </div>
      </div>
  );
};
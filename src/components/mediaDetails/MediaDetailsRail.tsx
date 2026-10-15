import React from "react";
import { Clapperboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MediaCard } from "../../network/ApiTypes";

interface MediaDetailsInfoSectionProps {
  media: MediaCard;
}

function splitGenres(genres?: string): string[] {
  if (!genres) return [];
  return genres
    .split(/[,•]/)
    .map((genre) => genre.trim())
    .filter(Boolean);
}

export const MediaDetailsInfoSection: React.FC<MediaDetailsInfoSectionProps> = ({ media }) => {
  const { t } = useTranslation("media");
  const genres = splitGenres(media.genres);
  const ratings = [
    media.imdbRating ? `IMDb ${media.imdbRating.toFixed(1)}` : null,
    media.kpRating ? `КП ${media.kpRating.toFixed(1)}` : null,
    media.tmdbRating ? `TMDB ${media.tmdbRating.toFixed(1)}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <section className="details-side-card details-info-card">
      <h2 className="details-side-card-title">{t("detailsPage.about")}</h2>
      <dl className="details-info-list">
        {media.originalTitle && media.originalTitle !== media.title && (
          <div className="details-info-row">
            <dt>{t("detailsPage.originalTitle")}</dt>
            <dd>{media.originalTitle}</dd>
          </div>
        )}
        <div className="details-info-row">
          <dt>{t("detailsPage.type")}</dt>
          <dd>{t(media.mediaType === "movie" ? "card.typeMovie" : "card.typeSeries")}</dd>
        </div>
        {media.year && (
          <div className="details-info-row">
            <dt>{t("detailsPage.year")}</dt>
            <dd>{media.year}</dd>
          </div>
        )}
        {media.numberOfSeasons && media.mediaType === "tv" && (
          <div className="details-info-row">
            <dt>{t("detailsPage.seasons")}</dt>
            <dd>{media.numberOfSeasons}</dd>
          </div>
        )}
        {media.ageRating && (
          <div className="details-info-row">
            <dt>{t("detailsPage.ageRating")}</dt>
            <dd>{media.ageRating}</dd>
          </div>
        )}
        {ratings && (
          <div className="details-info-row">
            <dt>{t("detailsPage.ratings")}</dt>
            <dd>{ratings}</dd>
          </div>
        )}
      </dl>

      {genres.length > 0 && (
        <div className="details-info-genres" aria-label={t("detailsPage.genres")}>
          {genres.map((genre) => <span key={genre}>{genre}</span>)}
        </div>
      )}
    </section>
  );
};

export const MediaRelatedSection: React.FC = () => {
  const { t } = useTranslation("media");

  return (
    <section className="details-side-card details-related-card">
      <h2 className="details-side-card-title">{t("detailsPage.related")}</h2>
      <div className="details-related-empty">
        <Clapperboard size="1.25rem" aria-hidden="true" />
        <span>{t("detailsPage.relatedEmpty")}</span>
      </div>
    </section>
  );
};

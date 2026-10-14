import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Star } from "lucide-react";
import type { MediaCard } from "../network/ApiTypes";
import { IconButton } from "./ui";

interface StreamMediaHeroProps {
  media: MediaCard;
  onBack: () => void;
}

interface StreamMediaHeroSkeletonProps {
  onBack: () => void;
}

export const StreamMediaHero: React.FC<StreamMediaHeroProps> = React.memo(({
  media,
  onBack,
}) => {
  const { t } = useTranslation("streams");
  const artworkSrc = media.bannerSrc || media.backdropSrc || media.posterSrc;

  return (
    <section className="streams-media-hero">
      <div
        className="streams-media-hero__artwork"
        style={artworkSrc ? { backgroundImage: `url("${artworkSrc}")` } : undefined}
        aria-hidden="true"
      />
      <IconButton
        className="streams-media-hero__back"
        onClick={onBack}
        title={t("actions.back")}
        aria-label={t("actions.back")}
      >
        <ArrowLeft size="1.125rem" />
      </IconButton>

      <div className="streams-media-hero__content">
        <div className="streams-media-hero__heading">
          <h1 className="streams-media-hero__title">{media.title}</h1>
          {media.originalTitle && (
            <p className="streams-media-hero__subtitle">{media.originalTitle}</p>
          )}
        </div>

        <div className="streams-media-hero__badges">
          {media.imdbRating != null && (
            <span className="rating-badge">
              <Star size="0.75rem" fill="currentColor" />
              <span>{media.imdbRating.toFixed(1)}</span>
            </span>
          )}
          {media.kpRating != null && (
            <span className="kp-rating-badge">КП {media.kpRating.toFixed(1)}</span>
          )}
          {media.ageRating && (
            <span className="media-glass-pill age-pill">{media.ageRating}</span>
          )}
        </div>

        {media.overview && (
          <p className="streams-media-hero__overview">{media.overview}</p>
        )}
      </div>
    </section>
  );
});

StreamMediaHero.displayName = "StreamMediaHero";

export const StreamMediaHeroSkeleton: React.FC<StreamMediaHeroSkeletonProps> = ({ onBack }) => {
  const { t } = useTranslation("streams");

  return (
    <section
      className="streams-media-hero streams-media-hero--loading skeleton-loading"
      aria-busy="true"
    >
      <div className="streams-media-hero__artwork skeleton" />
      <IconButton
        className="streams-media-hero__back"
        onClick={onBack}
        title={t("actions.back")}
        aria-label={t("actions.back")}
      >
        <ArrowLeft size="1.125rem" />
      </IconButton>
      <div className="streams-media-hero__content">
        <div className="skeleton streams-media-hero__title-skeleton" />
        <div className="skeleton streams-media-hero__text-skeleton" />
        <div className="skeleton streams-media-hero__text-skeleton streams-media-hero__text-skeleton--short" />
      </div>
    </section>
  );
};

export default StreamMediaHero;

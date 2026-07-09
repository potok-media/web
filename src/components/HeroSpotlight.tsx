import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Info, Plus, Check } from "lucide-react";
import type { HeroItem } from "../network/ApiTypes";
import { useHeroSlideshow } from "../hooks/useHeroSlideshow";
import { useHeroWatchlist } from "../hooks/useHeroWatchlist";
import { Button, Chip, cx } from "./ui";
import { areHeroSpotlightsEqual } from "./heroSpotlightCompare";

interface HeroSpotlightProps {
  items: HeroItem[];
  onPlay?: (item: HeroItem) => void;
  onDetails: (item: HeroItem) => void;
  autoFocus?: boolean;
}

const heroPropsEqual = (prev: HeroSpotlightProps, next: HeroSpotlightProps) =>
  areHeroSpotlightsEqual(prev.items, next.items);

export const HeroSpotlight: React.FC<HeroSpotlightProps> = React.memo((props) => {
  const { items: heroItems, onDetails } = props;
  const { t } = useTranslation("media");
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    activeIndex,
    prevIndex,
    displayedIndex,
    activeItem,
    changeActiveIndex,
    markImageLoaded,
  } = useHeroSlideshow(heroItems);

  const { watchlistStates, handleToggleWatchlist } = useHeroWatchlist(heroItems);

  if (!activeItem) return null;

  return (
    <div className="immersive-hero-container" ref={containerRef}>
      <section className="hero-banner">
        {heroItems.map((item, index) => {
          if (!item.card?.backdropSrc) return null;
          const isCurrent = index === displayedIndex;
          const isPrev = index === prevIndex;
          if (!isCurrent && !isPrev) return null;

          return (
            <img
              key={item.card.id || index}
              src={item.card.backdropSrc}
              className={`immersive-hero-backdrop ${isCurrent ? "is-current" : ""}`}
              decoding="async"
              onLoad={() => markImageLoaded(index)}
              alt=""
            />
          );
        })}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          {heroItems.map((item, index) => {
            const card = item.card;
            if (!card) return null;
            const isCurrent = index === displayedIndex;
            const isPrev = index === prevIndex;
            if (!isCurrent && !isPrev) return null;

            return (
              <div key={card.id || index} className={`hero-content ${isCurrent ? "is-current" : ""}`}>
                {card.logoSrc ? (
                  <img src={card.logoSrc} alt={card.title} className="hero-logo" decoding="async" />
                ) : (
                  <h1 className="hero-title">{card.title}</h1>
                )}

                <div className="hero-metadata-row">
                  {card.studioLogoSrc && (
                    <img src={card.studioLogoSrc} className="details-studio-logo hero-studio-logo-align" alt="Studio" />
                  )}
                  {card.subtitle && <span className="details-metadata-subtitle">{card.subtitle}</span>}
                  {card.imdbRating && <span className="rating-badge">IMDb {card.imdbRating.toFixed(1)}</span>}
                  {card.kpRating && <span className="kp-rating-badge">КП {card.kpRating.toFixed(1)}</span>}
                  {card.genres && <span>• {card.genres}</span>}
                  {card.ageRating && <span>• {card.ageRating}</span>}
                </div>

                <p className="hero-overview">{card.overview}</p>

                <div className="hero-buttons">
                  <Link
                    to={`/media/${card.mediaType}/${card.id}`}
                    className={cx("ui-btn", "ui-btn--accent")}
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        onDetails(item);
                      }
                    }}
                  >
                    <Info size="1.125rem" />
                    <span>{t("hero.details")}</span>
                  </Link>
                  <Button variant="glass" onClick={() => handleToggleWatchlist(card, index)}>
                    {watchlistStates[index] ? <Check size="1.125rem" className="hero-btn-success-check" /> : <Plus size="1.125rem" />}
                    <span>{watchlistStates[index] ? t("hero.inWatchlist") : t("hero.addToWatchlist")}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {heroItems.length > 1 && (
          <div className="hero-dots">
            {heroItems.map((_, index) => (
              <Chip
                key={index}
                active={index === activeIndex}
                className="hero-dot"
                onClick={() => changeActiveIndex(index)}
                aria-label={t("hero.slide", { number: index + 1 })}
                title={heroItems[index].card.title}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}, heroPropsEqual);

HeroSpotlight.displayName = "HeroSpotlight";
export default HeroSpotlight;
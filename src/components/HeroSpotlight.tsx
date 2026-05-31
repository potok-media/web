import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Info, Plus, Check } from "lucide-react";
import type { HeroItem } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
import { useHUD } from "../context/HUDContext";

interface HeroSpotlightProps {
  items: HeroItem[];
  onPlay: (item: HeroItem) => void;
  onDetails: (item: HeroItem) => void;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = React.memo((props) => {
  const { items, onDetails } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const heroItems = React.useMemo(() => items.slice(0, 10), [items]);
  const activeItem = heroItems[activeIndex];
  const card = activeItem?.card;

  const [inWatchlist, setInWatchlist] = useState(card?.isInWatchlist || false);
  const { show: showHUD } = useHUD();

  useEffect(() => {
    if (card) {
      setInWatchlist(card.isInWatchlist || false);
    }
  }, [activeIndex, card]);

  // Slideshow auto-rotation timer
  useEffect(() => {
    if (heroItems.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroItems.length);
    }, 15000); // 15 seconds slide duration

    return () => clearInterval(interval);
  }, [activeIndex, heroItems.length]);

  const handleToggleWatchlist = async () => {
    if (!card) return;
    try {
      const original = inWatchlist;
      setInWatchlist(!original);
      if (original) {
        await SyncApiClient.removeSyncWatchlist(card.id.toString(), card.mediaType);
      } else {
        await SyncApiClient.addSyncWatchlist(card.id.toString(), card.mediaType);
      }
      showHUD("success", original ? "Удалено из списка ожидания" : "Добавлено в список ожидания");
    } catch {
      setInWatchlist(card.isInWatchlist || false);
      showHUD("error", "Ошибка при синхронизации");
    }
  };

  if (!activeItem || !card) return null;

  return (
    <div className="immersive-hero-container">
      <section className="hero-banner" key={activeIndex}>
        {card.backdropSrc && (
          <img
            src={card.backdropSrc}
            className="immersive-hero-backdrop"
            alt=""
            decoding="async"
          />
        )}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          <div className="hero-content">
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
                className="btn-accent"
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    onDetails(activeItem);
                  }
                }}
              >
                <Info size={18} />
                <span>Подробнее</span>
              </Link>
              <button className="btn-glass" onClick={handleToggleWatchlist}>
                {inWatchlist ? <Check size={18} className="hero-btn-success-check" /> : <Plus size={18} />}
                <span>{inWatchlist ? "В списке" : "Буду смотреть"}</span>
              </button>
            </div>
          </div>
        </div>

        {heroItems.length > 1 && (
          <div className="hero-dots">
            {heroItems.map((_, index) => (
              <button
                key={index}
                className={`hero-dot ${index === activeIndex ? "active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Слайд ${index + 1}`}
                title={heroItems[index].card.title}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
});

HeroSpotlight.displayName = "HeroSpotlight";
export default HeroSpotlight;

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Info, Plus, Check } from "lucide-react";
import type { HeroItem } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
import { useHUD } from "../context/HUDContext";

interface HeroSpotlightProps {
  items: HeroItem[];
  onPlay?: (item: HeroItem) => void;
  onDetails: (item: HeroItem) => void;
  autoFocus?: boolean;
}

export function areHeroSpotlightsEqual(prevProps: HeroSpotlightProps, nextProps: HeroSpotlightProps): boolean {
  if (prevProps.items === nextProps.items) return true;
  if (prevProps.items.length !== nextProps.items.length) return false;
  for (let i = 0; i < prevProps.items.length; i++) {
    const a = prevProps.items[i];
    const b = nextProps.items[i];
    if (a.card.id !== b.card.id) return false;
    if (a.card.isInWatchlist !== b.card.isInWatchlist) return false;
  }
  return true;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = React.memo((props) => {
  const { items: heroItems, onDetails } = props;
  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const [slideState, setSlideState] = useState({
    activeIndex: 0,
    prevIndex: null as number | null,
    displayedIndex: 0,
  });

  const { activeIndex, prevIndex, displayedIndex } = slideState;
  const activeItem = heroItems[displayedIndex];

  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [watchlistStates, setWatchlistStates] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = true;

  // Sync watchlist states
  useEffect(() => {
    const states: Record<number, boolean> = {};
    heroItems.forEach((item, index) => {
      states[index] = !!item.card.isInWatchlist;
    });
    setWatchlistStates(states);
  }, [heroItems]);

  const changeActiveIndex = (nextIndex: number | ((prev: number) => number)) => {
    setSlideState((prev) => {
      const idx = typeof nextIndex === "function" ? nextIndex(prev.activeIndex) : nextIndex;
      if (idx === prev.activeIndex) return prev;
      return {
        ...prev,
        activeIndex: idx,
      };
    });
  };

  // Slideshow auto-rotation timer.
  useEffect(() => {
    if (heroItems.length <= 1 || !isVisible) return;

    const interval = setInterval(() => {
      changeActiveIndex((prev) => (prev + 1) % heroItems.length);
    }, 15000); // 15 seconds slide duration

    return () => clearInterval(interval);
  }, [heroItems.length, isVisible]);

  // Image preloading logic
  const requestedImagesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (heroItems.length === 0) return;

    const indicesToLoad = [activeIndex];
    if (heroItems.length > 1) {
      indicesToLoad.push((activeIndex + 1) % heroItems.length);
    }

    indicesToLoad.forEach((index) => {
      if (requestedImagesRef.current.has(index)) return;
      requestedImagesRef.current.add(index);

      const item = heroItems[index];
      const markLoaded = () => {
        setLoadedImages((prev) => {
          if (prev[index]) return prev;
          return { ...prev, [index]: true };
        });
      };

      if (item?.card?.backdropSrc) {
        const img = new Image();
        img.src = item.card.backdropSrc;
        img.onload = markLoaded;
        img.onerror = markLoaded;
        if (typeof img.decode === "function") {
          img.decode().then(markLoaded).catch(markLoaded);
        }
      } else {
        markLoaded();
      }

      // Preload logo image if exists
      if (item?.card?.logoSrc) {
        const logoImg = new Image();
        logoImg.src = item.card.logoSrc;
        if (typeof logoImg.decode === "function") {
          logoImg.decode().catch(() => {});
        }
      }
    });
  }, [activeIndex, heroItems]);

  // Synchronize displayedIndex to activeIndex when the target image is loaded
  useEffect(() => {
    if (loadedImages[activeIndex]) {
      if (displayedIndex !== activeIndex) {
        setSlideState((prev) => ({
          ...prev,
          prevIndex: prev.displayedIndex,
          displayedIndex: prev.activeIndex,
        }));
        
        // Clear previous index after transition finishes (850ms)
        const timer = setTimeout(() => {
          setSlideState((prev) => ({
            ...prev,
            prevIndex: null,
          }));
        }, 850);
        return () => clearTimeout(timer);
      }
    }
  }, [activeIndex, loadedImages, displayedIndex]);

  const handleToggleWatchlist = async (card: any, index: number) => {
    if (!card) return;
    try {
      const original = !!watchlistStates[index];
      setWatchlistStates(prev => ({ ...prev, [index]: !original }));
      if (original) {
        await SyncApiClient.removeSyncWatchlist(card.id.toString(), card.mediaType);
      } else {
        await SyncApiClient.addSyncWatchlist(card.id.toString(), card.mediaType);
      }
      showHUD("success", original ? t("watchlist.removed") : t("watchlist.added"));
    } catch {
      setWatchlistStates(prev => ({ ...prev, [index]: card.isInWatchlist || false }));
      showHUD("error", t("watchlist.syncError"));
    }
  };

  if (!activeItem) return null;

  return (
    <div className="immersive-hero-container" ref={containerRef}>
      <section className="hero-banner">
        {/* Render only current and previous backdrops for transition */}
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
              onLoad={() => {
                setLoadedImages((prev) => {
                  if (prev[index]) return prev;
                  return { ...prev, [index]: true };
                });
              }}
              alt=""
            />
          );
        })}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          {/* Render only current and previous content layouts */}
          {heroItems.map((item, index) => {
            const card = item.card;
            if (!card) return null;
            const isCurrent = index === displayedIndex;
            const isPrev = index === prevIndex;
            if (!isCurrent && !isPrev) return null;

            return (
              <div
                key={card.id || index}
                className={`hero-content ${isCurrent ? "is-current" : ""}`}
              >
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
                        onDetails(item);
                      }
                    }}
                  >
                    <Info size="1.125rem" />
                    <span>{t("hero.details")}</span>
                  </Link>
                  <button 
                    type="button"
                    className="btn-glass" 
                    onClick={() => handleToggleWatchlist(card, index)}
                  >
                    {watchlistStates[index] ? <Check size="1.125rem" className="hero-btn-success-check" /> : <Plus size="1.125rem" />}
                    <span>{watchlistStates[index] ? t("hero.inWatchlist") : t("hero.addToWatchlist")}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {heroItems.length > 1 && (
          <div className="hero-dots">
            {heroItems.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`hero-dot ${index === activeIndex ? "active" : ""}`}
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
}, areHeroSpotlightsEqual);

HeroSpotlight.displayName = "HeroSpotlight";
export default HeroSpotlight;

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Info, Plus, Check } from "lucide-react";
import type { HeroItem } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
import { useHUD } from "../context/HUDContext";
import { Focusable, FocusableButton } from "./common/TVNavigation";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";

interface HeroSpotlightProps {
  items: HeroItem[];
  onPlay: (item: HeroItem) => void;
  onDetails: (item: HeroItem) => void;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = React.memo((props) => {
  usePerformanceTrack("HeroSpotlight");
  const { items, onDetails } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [watchlistStates, setWatchlistStates] = useState<Record<number, boolean>>({});

  const heroItems = React.useMemo(() => items.slice(0, 10), [items]);
  const displayIndexToUse = displayedIndex !== null ? displayedIndex : activeIndex;
  const activeItem = heroItems[displayIndexToUse];
  const { show: showHUD } = useHUD();

  const containerRef = useRef<HTMLDivElement>(null);
  const hasFocusRef = useRef(false);

  const changeActiveIndex = (newIndex: number | ((prev: number) => number)) => {
    const hadFocus = containerRef.current?.contains(document.activeElement);
    if (hadFocus) {
      hasFocusRef.current = true;
    }
    setActiveIndex(newIndex);
  };

  // Sync watchlist states for all items
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    heroItems.forEach((item, index) => {
      initial[index] = item.card?.isInWatchlist || false;
    });
    setWatchlistStates(initial);
  }, [heroItems]);

  // Slideshow auto-rotation timer
  useEffect(() => {
    if (heroItems.length <= 1) return;

    const interval = setInterval(() => {
      changeActiveIndex((prev) => (prev + 1) % heroItems.length);
    }, 15000); // 15 seconds slide duration

    return () => clearInterval(interval);
  }, [activeIndex, heroItems.length]);

  // Preload all backdrop images and logo images of the 10 hero items on mount/change
  useEffect(() => {
    setLoadedImages({});
    setDisplayedIndex(null);

    heroItems.forEach((item, index) => {
      // Preload backdrop image
      if (item.card?.backdropSrc) {
        const img = new Image();
        img.src = item.card.backdropSrc;
        
        const markLoaded = () => {
          setLoadedImages((prev) => {
            if (prev[index]) return prev;
            return { ...prev, [index]: true };
          });
        };

        img.onload = markLoaded;
        img.onerror = markLoaded;

        if (typeof img.decode === "function") {
          img.decode().then(markLoaded).catch(markLoaded);
        }
      } else {
        setLoadedImages((prev) => {
          if (prev[index]) return prev;
          return { ...prev, [index]: true };
        });
      }

      // Preload logo image if exists
      if (item.card?.logoSrc) {
        const logoImg = new Image();
        logoImg.src = item.card.logoSrc;
        if (typeof logoImg.decode === "function") {
          logoImg.decode().catch(() => {});
        }
      }
    });
  }, [heroItems]);

  // Synchronize displayedIndex to activeIndex when the target image is loaded
  useEffect(() => {
    if (loadedImages[activeIndex]) {
      setDisplayedIndex(activeIndex);
    }
  }, [activeIndex, loadedImages]);

  useEffect(() => {
    if (heroItems.length > 0) {
      setFocus("HERO_DETAILS_BUTTON");
    }
  }, [heroItems.length]);

  useEffect(() => {
    if (hasFocusRef.current) {
      const detailsBtn = containerRef.current?.querySelector<HTMLAnchorElement>(".btn-accent");
      if (detailsBtn) {
        detailsBtn.focus();
      }
      hasFocusRef.current = false;
    }
  }, [activeIndex]);

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
      showHUD("success", original ? "Удалено из списка ожидания" : "Добавлено в список ожидания");
    } catch {
      setWatchlistStates(prev => ({ ...prev, [index]: card.isInWatchlist || false }));
      showHUD("error", "Ошибка при синхронизации");
    }
  };

  if (!activeItem) return null;

  return (
    <div className="immersive-hero-container" ref={containerRef}>
      <section className="hero-banner">
        {/* Render all 10 backdrops so they preload immediately and cross-fade smoothly */}
        {heroItems.map((item, index) => {
          if (!item.card?.backdropSrc) return null;
          return (
            <img
              key={item.card.id || index}
              src={item.card.backdropSrc}
              className="immersive-hero-backdrop"
              onLoad={() => {
                setLoadedImages((prev) => {
                  if (prev[index]) return prev;
                  return { ...prev, [index]: true };
                });
              }}
              style={{
                opacity: index === displayedIndex ? 1 : 0,
                pointerEvents: "none",
                transition: "opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
              alt=""
            />
          );
        })}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          {/* Render all 10 content layouts absolutely positioned to overlay each other and cross-fade smoothly */}
          {heroItems.map((item, index) => {
            const card = item.card;
            if (!card) return null;
            const isCurrent = index === displayedIndex;

            return (
              <div
                key={card.id || index}
                className="hero-content"
                style={{
                  position: isCurrent ? "relative" : "absolute",
                  bottom: isCurrent ? undefined : "var(--space-m)",
                  left: isCurrent ? undefined : "var(--space-l)",
                  opacity: isCurrent ? 1 : 0,
                  pointerEvents: isCurrent ? "auto" : "none",
                  transition: "opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                  zIndex: isCurrent ? 2 : 1
                }}
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
                  <Focusable
                    focusKey="HERO_DETAILS_BUTTON"
                    focusable={isCurrent}
                    onEnterPress={() => {
                      onDetails(item);
                    }}
                  >
                    {({ ref: detailsRef, focused }) => {
                      const setRefs = (node: HTMLAnchorElement | null) => {
                        (detailsRef as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
                      };
                      return (
                        <Link 
                          ref={setRefs}
                          to={`/media/${card.mediaType}/${card.id}`}
                          className={`btn-accent ${focused ? "focused" : ""}`}
                          onClick={(e) => {
                            if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                              e.preventDefault();
                              onDetails(item);
                            }
                          }}
                        >
                          <Info size={18} />
                          <span>Подробнее</span>
                        </Link>
                      );
                    }}
                  </Focusable>
                  <FocusableButton 
                    className="btn-glass" 
                    onClick={() => handleToggleWatchlist(card, index)}
                    focusable={isCurrent}
                  >
                    {watchlistStates[index] ? <Check size={18} className="hero-btn-success-check" /> : <Plus size={18} />}
                    <span>{watchlistStates[index] ? "В списке" : "Буду смотреть"}</span>
                  </FocusableButton>
                </div>
              </div>
            );
          })}
        </div>

        {heroItems.length > 1 && (
          <div className="hero-dots">
            {heroItems.map((_, index) => (
              <FocusableButton
                key={index}
                className={`hero-dot ${index === activeIndex ? "active" : ""}`}
                onClick={() => changeActiveIndex(index)}
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

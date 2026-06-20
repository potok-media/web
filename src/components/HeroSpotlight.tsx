import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Info, Plus, Check } from "lucide-react";
import type { HeroItem } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
import { useHUD } from "../context/HUDContext";
import { Focusable, FocusableButton } from "./common/TVNavigation";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { PlatformManager } from "../utils/PlatformManager";

interface HeroSpotlightProps {
  items: HeroItem[];
  onPlay: (item: HeroItem) => void;
  onDetails: (item: HeroItem) => void;
  // When false, the hero won't grab focus on mount — the host page owns initial focus (so it can
  // restore the remembered card on Back instead of being overridden by the hero button). Default true.
  autoFocus?: boolean;
}

const areHeroSpotlightsEqual = (
  prevProps: HeroSpotlightProps,
  nextProps: HeroSpotlightProps
): boolean => {
  if (prevProps.items.length !== nextProps.items.length) return false;
  for (let i = 0; i < prevProps.items.length; i++) {
    const pItem = prevProps.items[i];
    const nItem = nextProps.items[i];
    if (pItem.id !== nItem.id) return false;
    if (pItem.card?.id !== nItem.card?.id) return false;
    if (pItem.card?.title !== nItem.card?.title) return false;
    if (pItem.card?.isInWatchlist !== nItem.card?.isInWatchlist) return false;
  }
  return true;
};

export const HeroSpotlight: React.FC<HeroSpotlightProps> = React.memo((props) => {
  const { items, onDetails } = props;

  interface SlideState {
    activeIndex: number;
    displayedIndex: number;
    prevIndex: number | null;
  }

  const [slideState, setSlideState] = useState<SlideState>({
    activeIndex: 0,
    displayedIndex: 0,
    prevIndex: null,
  });
  const { activeIndex, displayedIndex, prevIndex } = slideState;

  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [watchlistStates, setWatchlistStates] = useState<Record<number, boolean>>({});
  const [isVisible, setIsVisible] = useState(true);

  const heroItems = React.useMemo(() => items.slice(0, 10), [items]);
  const displayIndexToUse = displayedIndex;
  const activeItem = heroItems[displayIndexToUse];
  const { show: showHUD } = useHUD();

  const containerRef = useRef<HTMLDivElement>(null);
  const hasFocusRef = useRef(false);
  // Tracks which slide indices have already had their images requested, so the
  // preload effect never re-creates Image objects when loadedImages updates.
  const requestedImagesRef = useRef<Set<number>>(new Set());

  const [prevHeroItems, setPrevHeroItems] = useState<HeroItem[]>([]);
  if (heroItems !== prevHeroItems) {
    setPrevHeroItems(heroItems);
    setLoadedImages({});
    requestedImagesRef.current = new Set();
    setSlideState({
      activeIndex: 0,
      displayedIndex: 0,
      prevIndex: null,
    });
  }

  const changeActiveIndex = (newIndex: number | ((prev: number) => number)) => {
    const hadFocus = containerRef.current?.contains(document.activeElement);
    if (hadFocus) {
      hasFocusRef.current = true;
    }
    setSlideState((prev) => {
      const idx = typeof newIndex === "function" ? newIndex(prev.activeIndex) : newIndex;
      return {
        ...prev,
        activeIndex: idx,
      };
    });
  };

  // Setup IntersectionObserver for visibility tracking
  useEffect(() => {
    const currentRef = containerRef.current;
    if (!currentRef) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(currentRef);
    return () => {
      observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, []);

  // Sync watchlist states for all items
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    heroItems.forEach((item, index) => {
      initial[index] = item.card?.isInWatchlist || false;
    });
    setWatchlistStates(initial);
  }, [heroItems]);

  // Slideshow auto-rotation timer. Disabled on TV — a periodic full-screen
  // backdrop crossfade + image decode causes visible hitches on weak GPUs.
  useEffect(() => {
    if (heroItems.length <= 1 || !isVisible || PlatformManager.isTV()) return;

    const interval = setInterval(() => {
      changeActiveIndex((prev) => (prev + 1) % heroItems.length);
    }, 15000); // 15 seconds slide duration

    return () => clearInterval(interval);
  }, [activeIndex, heroItems.length, isVisible]);

  // Preload only active and next backdrop/logo images to save memory and network.
  // Requested indices are tracked in a ref so loadedImages updates never re-trigger
  // this effect or re-create Image objects.
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

  useEffect(() => {
    if (props.autoFocus !== false && PlatformManager.isTV() && heroItems.length > 0) {
      setFocus("HERO_DETAILS_BUTTON");
    }
  }, [heroItems.length, props.autoFocus]);

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
                          <Info size="1.125rem" />
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
                    {watchlistStates[index] ? <Check size="1.125rem" className="hero-btn-success-check" /> : <Plus size="1.125rem" />}
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
}, areHeroSpotlightsEqual);

HeroSpotlight.displayName = "HeroSpotlight";
export default HeroSpotlight;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import { useHUD } from "../context/HUDContext";
import type { TvEpisode } from "../network/ApiTypes";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight, ChevronDown, Tv, Check, Eye, ListTodo } from "lucide-react";
import { Grid } from "./common/Grid";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { FocusableButton, FocusableContainer } from "./common/TVNavigation";
import { PlatformManager } from "../utils/PlatformManager";

const IS_TV = PlatformManager.isTV();
// Render fewer episode stills at once on weak TV hardware (each is a JPEG decode).
const EPISODE_CHUNK = IS_TV ? 8 : 24;

interface SeasonEpisodesSectionProps {
  mediaId: number;
  numberOfSeasons: number;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number) => void;
  selectedEpisode?: { episode: TvEpisode; seasonNumber: number } | null;
  watchedEpisodes?: { season: number; number: number }[];
  toggleEpisodeWatched?: (seasonNumber: number, episodeNumber: number, nextState: boolean) => Promise<void>;
  toggleSeasonWatched?: (seasonNumber: number, episodesList: TvEpisode[], nextState: boolean) => Promise<void>;
  onOpenMultiPicker?: () => void;
}

export const SeasonEpisodesSection: React.FC<SeasonEpisodesSectionProps> = ({
  mediaId,
  numberOfSeasons,
  onEpisodeClick,
  selectedEpisode,
  watchedEpisodes = [],
  toggleEpisodeWatched,
  toggleSeasonWatched,
  onOpenMultiPicker,
}) => {
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const { episodes, loading, error } = useSeasonEpisodes(mediaId, activeSeason);
  const { show: showHUD } = useHUD();

  const [showSeasonPopover, setShowSeasonPopover] = useState(false);
  const [showWatchPopover, setShowWatchPopover] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    episode: TvEpisode;
    x: number;
    y: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [visibleCount, setVisibleCount] = useState(EPISODE_CHUNK);
  const scrollRafRef = useRef<number | null>(null);

  const prevShowSeasonPopover = useRef(showSeasonPopover);
  const prevShowWatchPopover = useRef(showWatchPopover);
  const prevContextMenu = useRef(contextMenu);
  const triggerEpisodeCardIdRef = useRef<number | null>(null);

  // Focus transition for Season popover
  useEffect(() => {
    if (showSeasonPopover) {
      setFocus(`SEASON_POP_ITEM_${activeSeason}`);
    } else if (prevShowSeasonPopover.current && !showSeasonPopover) {
      setFocus("SEASON_SELECT_TRIGGER");
    }
    prevShowSeasonPopover.current = showSeasonPopover;
  }, [showSeasonPopover, activeSeason]);

  // Focus transition for Watch popover
  useEffect(() => {
    if (showWatchPopover) {
      setFocus("SEASON_WATCH_ITEM_MARK_ALL");
    } else if (prevShowWatchPopover.current && !showWatchPopover) {
      setFocus("SEASON_WATCH_TRIGGER");
    }
    prevShowWatchPopover.current = showWatchPopover;
  }, [showWatchPopover]);

  // Focus transition for Context menu
  useEffect(() => {
    if (contextMenu) {
      triggerEpisodeCardIdRef.current = contextMenu.episode.id;
      setFocus("EPISODE_CONTEXT_MENU_MARK_WATCHED");
    } else if (prevContextMenu.current && !contextMenu && triggerEpisodeCardIdRef.current !== null) {
      setFocus(`EPISODE_CARD_${triggerEpisodeCardIdRef.current}`);
    }
    prevContextMenu.current = contextMenu;
  }, [contextMenu]);

  useEffect(() => {
    const handleBack = (e: Event) => {
      if (showSeasonPopover) {
        e.preventDefault();
        setShowSeasonPopover(false);
      } else if (showWatchPopover) {
        e.preventDefault();
        setShowWatchPopover(false);
      } else if (contextMenu) {
        e.preventDefault();
        setContextMenu(null);
      }
    };
    window.addEventListener("potok-back-pressed", handleBack);
    return () => window.removeEventListener("potok-back-pressed", handleBack);
  }, [showSeasonPopover, showWatchPopover, contextMenu]);

  // Throttled to one layout read per frame — onScroll fires per pixel during
  // D-pad-driven scrolling and reading scrollLeft/scrollWidth forces reflow.
  const checkScrollLimits = useCallback(() => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const container = scrollRef.current;
      if (!container) return;
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);

      // Chunk load episodes if user scrolls near the end
      if (scrollLeft + clientWidth >= scrollWidth - 200 && visibleCount < episodes.length) {
        setVisibleCount(prev => Math.min(prev + EPISODE_CHUNK, episodes.length));
      }
    });
  }, [visibleCount, episodes.length]);

  // Reset active season back to 1 and reset modes when mediaId changes
  useEffect(() => {
    setActiveSeason(1);
    setContextMenu(null);
    setVisibleCount(EPISODE_CHUNK);
  }, [mediaId]);

  useEffect(() => {
    setVisibleCount(EPISODE_CHUNK);
  }, [activeSeason]);

  useEffect(() => {
    if (error) {
      showHUD("error", error);
    }
  }, [error, showHUD]);

  useEffect(() => {
    if (episodes.length > 0) {
      const timeoutId = setTimeout(checkScrollLimits, 150);
      return () => clearTimeout(timeoutId);
    } else {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, [episodes, checkScrollLimits]);

  useEffect(() => {
    window.addEventListener("resize", checkScrollLimits);
    return () => window.removeEventListener("resize", checkScrollLimits);
  }, [checkScrollLimits]);

  const handleScroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isEpisodeWatched = useCallback((epNum: number) => {
    return watchedEpisodes.some(we => we.season === activeSeason && we.number === epNum);
  }, [watchedEpisodes, activeSeason]);

  // Stable per-card handlers — keep EpisodeCard's React.memo intact during D-pad
  // navigation so scroll-driven re-renders of the section don't re-render every card.
  const handleEpisodeClick = useCallback((ep: TvEpisode) => {
    onEpisodeClick(ep, activeSeason);
  }, [onEpisodeClick, activeSeason]);

  const handleEpisodeContextMenu = useCallback((ep: TvEpisode, x: number, y: number) => {
    setContextMenu({ episode: ep, x, y });
  }, []);

  const handleEpisodeFocus = useCallback((ep: TvEpisode) => {
    const idx = episodes.findIndex(e => e.id === ep.id);
    if (idx >= visibleCount - 4 && visibleCount < episodes.length) {
      setVisibleCount(prev => Math.min(prev + EPISODE_CHUNK, episodes.length));
    }
  }, [episodes, visibleCount]);

  const isSeasonFullyWatched = episodes.length > 0 && episodes.every(ep => isEpisodeWatched(ep.episodeNumber));

  if (numberOfSeasons <= 0) return null;

  const renderX = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 190) : 0;
  const renderY = contextMenu ? Math.min(contextMenu.y, window.innerHeight - 100) : 0;

  return (
    <section className="season-episodes-section" style={{ minHeight: "350px" }}>
      <h2 className="season-episodes-title">Выбор серий</h2>

      <div className="season-selector-row">
        {/* Season Selector Popover */}
        <div className="season-select-wrapper">
          <FocusableButton 
            focusKey="SEASON_SELECT_TRIGGER"
            className="season-select-trigger-btn" 
            onClick={() => setShowSeasonPopover(prev => !prev)}
            aria-expanded={showSeasonPopover}
          >
            Сезон {activeSeason}
            <ChevronDown size={16} />
          </FocusableButton>
          
          {showSeasonPopover && (
            <>
              <div className="popover-overlay" onClick={() => setShowSeasonPopover(false)} />
              <FocusableContainer focusKey="SEASON_POPOVER_CONTAINER" isFocusBoundary={true} className="season-popover-menu">
                <div className="popover-header">Выберите сезон</div>
                <div className="popover-scrollable-list">
                  {Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map((sNum) => (
                    <FocusableButton
                      key={sNum}
                      focusKey={`SEASON_POP_ITEM_${sNum}`}
                      className={`season-popover-item ${activeSeason === sNum ? "active" : ""}`}
                      onClick={() => {
                        setActiveSeason(sNum);
                        setShowSeasonPopover(false);
                      }}
                    >
                      <Tv size={16} className="season-item-icon" />
                      <span>Сезон {sNum}</span>
                      {activeSeason === sNum && <Check size={16} className="season-active-check" />}
                    </FocusableButton>
                  ))}
                </div>
              </FocusableContainer>
            </>
          )}
        </div>

        {/* Season Watch Toggle Popover */}
        {toggleSeasonWatched && (
          <div className="season-watch-wrapper">
            <FocusableButton
              focusKey="SEASON_WATCH_TRIGGER"
              className="season-watch-trigger-btn"
              onClick={() => {
                // On TV skip the granular multi-picker popup entirely (it renders
                // every episode of every season → kills FPS). One press toggles the
                // whole active season watched/unwatched.
                if (IS_TV) {
                  toggleSeasonWatched?.(activeSeason, episodes, !isSeasonFullyWatched);
                } else {
                  setShowWatchPopover(prev => !prev);
                }
              }}
              aria-expanded={!IS_TV && showWatchPopover}
              title={IS_TV ? (isSeasonFullyWatched ? "Снять отметку с сезона" : "Отметить сезон просмотренным") : "Выбор и просмотр серий"}
            >
              {isSeasonFullyWatched ? <Check size={18} /> : <Eye size={18} />}
              {!IS_TV && <ChevronDown size={12} />}
            </FocusableButton>

            {!IS_TV && showWatchPopover && (
              <>
                <div className="popover-overlay" onClick={() => setShowWatchPopover(false)} />
                <FocusableContainer focusKey="WATCH_POPOVER_CONTAINER" isFocusBoundary={true} className="watch-popover-menu">
                  <div className="popover-header">Выбор серий</div>
                  <FocusableButton
                    focusKey="SEASON_WATCH_ITEM_MARK_ALL"
                    className="watch-popover-item"
                    onClick={() => {
                      toggleSeasonWatched?.(activeSeason, episodes, !isSeasonFullyWatched);
                      setShowWatchPopover(false);
                    }}
                  >
                    <Eye size={16} className="watch-item-icon" />
                    <span>{isSeasonFullyWatched ? "Снять отметку" : "Отметить сезон"}</span>
                  </FocusableButton>
                  <FocusableButton
                    focusKey="SEASON_WATCH_ITEM_MULTI_PICK"
                    className="watch-popover-item"
                    onClick={() => {
                      setShowWatchPopover(false);
                      onOpenMultiPicker?.();
                    }}
                  >
                    <ListTodo size={16} className="watch-item-icon" />
                    <span>Отметить выборочно...</span>
                  </FocusableButton>
                </FocusableContainer>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Grid 
          minWidth="280px" 
          gap="16px" 
          className="season-episodes-skeleton-grid" 
          style={{ 
            minHeight: "220px",
            marginTop: "16px"
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className="episode-card-skeleton" 
              style={{ 
                height: "230px", 
                background: "rgba(255, 255, 255, 0.03)", 
                borderRadius: "12px", 
                border: "1px solid rgba(255, 255, 255, 0.05)",
                opacity: 0.6,
              }} 
            />
          ))}
        </Grid>
      ) : episodes.length > 0 ? (
        <div className="episodes-carousel-wrapper">
          {canScrollLeft && (
            <button
              type="button"
              className="carousel-nav-btn left"
              onClick={() => handleScroll("left")}
              aria-label="Прокрутить назад"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="episodes-scroll-container"
            ref={scrollRef}
            onScroll={checkScrollLimits}
          >
            {episodes.slice(0, visibleCount).map((ep) => {
              const watched = isEpisodeWatched(ep.episodeNumber);
              return (
                <EpisodeCard
                  key={ep.id}
                  focusKey={`EPISODE_CARD_${ep.id}`}
                  episode={ep}
                  onClick={handleEpisodeClick}
                  isActive={selectedEpisode?.episode.id === ep.id}
                  isWatched={watched}
                  onContextMenu={handleEpisodeContextMenu}
                  onFocus={handleEpisodeFocus}
                />
              );
            })}
          </div>

          {canScrollRight && (
            <button
              type="button"
              className="carousel-nav-btn right"
              onClick={() => handleScroll("right")}
              aria-label="Прокрутить вперед"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className="season-episodes-empty">
          Нет сведений об эпизодах этого сезона.
        </div>
      )}

      {/* Custom Context Menu Popover for Long Press / Right Click */}
      {contextMenu && (
        <>
          <div 
            className="popover-overlay" 
            onClick={() => setContextMenu(null)} 
            onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} 
          />
          <FocusableContainer 
            focusKey="EPISODE_CONTEXT_MENU_CONTAINER"
            isFocusBoundary={true}
            className="episode-card-context-menu"
            style={{
              position: "fixed",
              left: `${renderX}px`,
              top: `${renderY}px`,
            }}
          >
            <FocusableButton
              focusKey="EPISODE_CONTEXT_MENU_MARK_WATCHED"
              className="context-menu-item"
              onClick={() => {
                const watched = isEpisodeWatched(contextMenu.episode.episodeNumber);
                toggleEpisodeWatched?.(activeSeason, contextMenu.episode.episodeNumber, !watched);
                setContextMenu(null);
              }}
            >
              <Eye size={14} />
              <span>
                {isEpisodeWatched(contextMenu.episode.episodeNumber) 
                  ? "Убрать отметку просмотрено" 
                  : "Отметить просмотренным"}
              </span>
            </FocusableButton>
          </FocusableContainer>
        </>
      )}
    </section>
  );
};

export default SeasonEpisodesSection;

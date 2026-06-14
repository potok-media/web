import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import { useHUD } from "../context/HUDContext";
import type { TvEpisode } from "../network/ApiTypes";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight, ChevronDown, Tv, Check, Eye, ListTodo } from "lucide-react";
import { Grid } from "./common/Grid";
import { FocusableButton } from "./common/TVNavigation";

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

  const checkScrollLimits = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  }, []);

  // Reset active season back to 1 and reset modes when mediaId changes
  useEffect(() => {
    setActiveSeason(1);
    setContextMenu(null);
  }, [mediaId]);

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
              <div className="season-popover-menu">
                <div className="popover-header">Выберите сезон</div>
                <div className="popover-scrollable-list">
                  {Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map((sNum) => (
                    <FocusableButton
                      key={sNum}
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
              </div>
            </>
          )}
        </div>

        {/* Season Watch Toggle Popover */}
        {toggleSeasonWatched && (
          <div className="season-watch-wrapper">
            <FocusableButton 
              className="season-watch-trigger-btn" 
              onClick={() => setShowWatchPopover(prev => !prev)}
              aria-expanded={showWatchPopover}
              title="Выбор и просмотр серий"
            >
              <Eye size={18} />
              <ChevronDown size={12} />
            </FocusableButton>

            {showWatchPopover && (
              <>
                <div className="popover-overlay" onClick={() => setShowWatchPopover(false)} />
                <div className="watch-popover-menu">
                  <div className="popover-header">Выбор серий</div>
                  <FocusableButton
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
                    className="watch-popover-item"
                    onClick={() => {
                      setShowWatchPopover(false);
                      onOpenMultiPicker?.();
                    }}
                  >
                    <ListTodo size={16} className="watch-item-icon" />
                    <span>Отметить выборочно...</span>
                  </FocusableButton>
                </div>
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
            {episodes.map((ep) => {
              const watched = isEpisodeWatched(ep.episodeNumber);
              return (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  onClick={() => onEpisodeClick(ep, activeSeason)}
                  isActive={selectedEpisode?.episode.id === ep.id}
                  isWatched={watched}
                  onContextMenu={(x, y) => setContextMenu({ episode: ep, x, y })}
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
          <div 
            className="episode-card-context-menu"
            style={{
              position: "fixed",
              left: `${renderX}px`,
              top: `${renderY}px`,
            }}
          >
            <FocusableButton
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
          </div>
        </>
      )}
    </section>
  );
};

export default SeasonEpisodesSection;

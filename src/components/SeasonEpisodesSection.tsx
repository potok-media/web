import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import type { TvEpisode } from "../network/ApiTypes";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight, ChevronDown, Tv, Check, Eye, ListTodo } from "lucide-react";
import { ScrollView } from "./common/ScrollView";
import { Grid } from "./common/Grid";

const EPISODE_CHUNK = 24;

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
  const { t } = useTranslation("media");
  const [activeSeason, setActiveSeason] = useState(1);
  const [showSeasonPopover, setShowSeasonPopover] = useState(false);
  const [showWatchPopover, setShowWatchPopover] = useState(false);
  const [visibleCount, setVisibleCount] = useState(EPISODE_CHUNK);

  const { episodes, loading } = useSeasonEpisodes(mediaId, activeSeason);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Context menu state for episode card right click / long press
  const [contextMenu, setContextMenu] = useState<{
    episode: TvEpisode;
    x: number;
    y: number;
  } | null>(null);

  // Check scroll positions to show navigation arrows
  const checkScrollLimits = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  // Update scroll limit checks when episodes or viewport dimensions change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Tiny delay to ensure browser layout finishes
    const timer = setTimeout(checkScrollLimits, 80);

    const observer = new ResizeObserver(() => checkScrollLimits());
    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [episodes, checkScrollLimits]);

  // Handle manual navigation arrows click
  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    
    const cardEl = el.querySelector(".episode-card");
    const scrollAmount = cardEl ? cardEl.clientWidth * 3 : el.clientWidth * 0.8;
    
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  };

  // Reset scroll state on active season change
  useEffect(() => {
    setVisibleCount(EPISODE_CHUNK);
    const el = scrollRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
  }, [activeSeason]);

  // Compute if all episodes in the current season are watched
  const isSeasonFullyWatched = useMemo(() => {
    if (episodes.length === 0) return false;
    return episodes.every(ep => 
      watchedEpisodes.some(we => we.season === activeSeason && we.number === ep.episodeNumber)
    );
  }, [episodes, watchedEpisodes, activeSeason]);

  // Check if specific episode is watched
  const isEpisodeWatched = useCallback((episodeNumber: number) => {
    return watchedEpisodes.some(we => we.season === activeSeason && we.number === episodeNumber);
  }, [watchedEpisodes, activeSeason]);

  // Helper trigger to notify host application when an episode is clicked
  const handleEpisodeClick = useCallback((episode: TvEpisode) => {
    onEpisodeClick(episode, activeSeason);
  }, [onEpisodeClick, activeSeason]);

  // Triggered when an episode card is focused (handles pagination logic)
  const handleEpisodeFocus = useCallback((episode: TvEpisode) => {
    // If the focused episode is near the end of our current chunk, load more episodes
    const index = episodes.findIndex(e => e.id === episode.id);
    if (index >= visibleCount - 4 && visibleCount < episodes.length) {
      setVisibleCount(prev => Math.min(prev + EPISODE_CHUNK, episodes.length));
    }
  }, [episodes, visibleCount]);

  // Context menu trigger (onContextMenu & longPress)
  const handleEpisodeContextMenu = useCallback((episode: TvEpisode, clientX: number, clientY: number) => {
    setContextMenu({
      episode,
      x: clientX,
      y: clientY
    });
  }, []);

  // Compute coordinates safe for viewport bounds
  const getSafeContextMenuCoords = () => {
    if (!contextMenu) return { renderX: 0, renderY: 0 };
    const menuWidth = 180;
    const menuHeight = 50;
    
    let renderX = contextMenu.x;
    let renderY = contextMenu.y;

    if (renderX + menuWidth > window.innerWidth) {
      renderX = window.innerWidth - menuWidth - 10;
    }
    if (renderY + menuHeight > window.innerHeight) {
      renderY = window.innerHeight - menuHeight - 10;
    }

    return { renderX, renderY };
  };

  const { renderX, renderY } = getSafeContextMenuCoords();

  return (
    <section className="season-episodes-section">
      <h2 className="season-episodes-title">{t("seasons.episodeSelection")}</h2>

      <div className="season-selector-row">
        {/* Season Selector Popover */}
        <div className="season-select-wrapper">
          <button
            type="button"
            className="season-select-trigger-btn"
            onClick={() => setShowSeasonPopover(prev => !prev)}
            aria-expanded={showSeasonPopover}
          >
            <span>{t("seasons.season", { number: activeSeason })}</span>
            <ChevronDown size="0.875rem" />
          </button>

          {showSeasonPopover && (
            <>
              <div className="popover-overlay" onClick={() => setShowSeasonPopover(false)} />
              <div className="season-popover-menu">
                {Array.from({ length: numberOfSeasons }).map((_, idx) => {
                  const sNum = idx + 1;
                  return (
                    <button
                      key={sNum}
                      type="button"
                      className={`season-popover-item ${activeSeason === sNum ? "active" : ""}`}
                      onClick={() => {
                        setActiveSeason(sNum);
                        setShowSeasonPopover(false);
                      }}
                    >
                      <Tv size="1rem" className="season-item-icon" />
                      <span>{t("seasons.season", { number: sNum })}</span>
                      {activeSeason === sNum && <Check size="1rem" className="season-active-check" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Season Watch Toggle Popover */}
        {toggleSeasonWatched && (
          <div className="season-watch-wrapper">
            <button
              type="button"
              className="season-watch-trigger-btn"
              onClick={() => {
                setShowWatchPopover(prev => !prev);
              }}
              aria-expanded={showWatchPopover}
              title={t("seasons.selectAndWatch")}
            >
              {isSeasonFullyWatched ? <Check size="1.125rem" /> : <Eye size="1.125rem" />}
              <ChevronDown size="0.75rem" />
            </button>

            {showWatchPopover && (
              <>
                <div className="popover-overlay" onClick={() => setShowWatchPopover(false)} />
                <div className="watch-popover-menu">
                  <div className="popover-header">{t("seasons.episodeSelection")}</div>
                  <button
                    type="button"
                    className="watch-popover-item"
                    onClick={() => {
                      toggleSeasonWatched?.(activeSeason, episodes, !isSeasonFullyWatched);
                      setShowWatchPopover(false);
                    }}
                  >
                    <Eye size="1rem" className="watch-item-icon" />
                    <span>{isSeasonFullyWatched ? t("seasons.unmark") : t("seasons.markSeason")}</span>
                  </button>
                  <button
                    type="button"
                    className="watch-popover-item"
                    onClick={() => {
                      setShowWatchPopover(false);
                      onOpenMultiPicker?.();
                    }}
                  >
                    <ListTodo size="1rem" className="watch-item-icon" />
                    <span>{t("seasons.markSelectively")}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <Grid 
          minWidth="17.5rem"
          gap="1rem"
          className="season-episodes-skeleton-grid"
          style={{
            minHeight: "13.75rem",
            marginTop: "1rem"
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className="episode-card-skeleton" 
              style={{ 
                height: "14.375rem",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "0.75rem",
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
              aria-label={t("seasons.scrollBack")}
            >
              <ChevronLeft size="1.25rem" />
            </button>
          )}

          <ScrollView
            orientation="horizontal"
            className="episodes-scroll-viewport"
            trackClassName="episodes-scroll-container"
            viewportRef={scrollRef}
            onScroll={checkScrollLimits}
          >
            {episodes.slice(0, visibleCount).map((ep) => {
              const watched = isEpisodeWatched(ep.episodeNumber);
              return (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  onClick={handleEpisodeClick}
                  isActive={selectedEpisode?.episode.id === ep.id}
                  isWatched={watched}
                  onContextMenu={handleEpisodeContextMenu}
                  onFocus={handleEpisodeFocus}
                />
              );
            })}
          </ScrollView>

          {canScrollRight && (
            <button
              type="button"
              className="carousel-nav-btn right"
              onClick={() => handleScroll("right")}
              aria-label={t("seasons.scrollForward")}
            >
              <ChevronRight size="1.25rem" />
            </button>
          )}
        </div>
      ) : (
        <div className="season-episodes-empty">
          {t("seasons.noEpisodes")}
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
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                const watched = isEpisodeWatched(contextMenu.episode.episodeNumber);
                toggleEpisodeWatched?.(activeSeason, contextMenu.episode.episodeNumber, !watched);
                setContextMenu(null);
              }}
            >
              <Eye size="0.875rem" />
              <span>
                {isEpisodeWatched(contextMenu.episode.episodeNumber)
                  ? t("seasons.unmarkWatched")
                  : t("seasons.markWatched")}
              </span>
            </button>
          </div>
        </>
      )}
    </section>
  );
};

const useMemo = React.useMemo;

export default SeasonEpisodesSection;

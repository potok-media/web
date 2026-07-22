import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import type { TvEpisode } from "../network/ApiTypes";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollView } from "./common/ScrollView";
import { Grid } from "./common/Grid";
import { IconButton } from "./ui";
import { SeasonEpisodesToolbar } from "./SeasonEpisodesToolbar";
import { EpisodeContextMenu } from "./EpisodeContextMenu";
import { EpisodesListPopup } from "./EpisodesListPopup";
import { LayoutList } from "lucide-react";

// Cap the carousel so long seasons don't render hundreds of cards or force endless scrolling.
// When a season has more episodes, the last slot becomes an "All" card that opens the full list popup.
const CAROUSEL_LIMIT = 15;

interface SeasonEpisodesSectionProps {
  mediaId: number;
  mediaTitle?: string;
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
  mediaTitle,
}) => {
  const { t } = useTranslation("media");
  const [activeSeason, setActiveSeason] = useState(1);
  const [showSeasonPopover, setShowSeasonPopover] = useState(false);
  const [showWatchPopover, setShowWatchPopover] = useState(false);
  const [showAllEpisodesPopup, setShowAllEpisodesPopup] = useState(false);

  const { episodes, loading } = useSeasonEpisodes(mediaId, activeSeason);
  const hasMoreThanCarousel = episodes.length > CAROUSEL_LIMIT;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    episode: TvEpisode;
    x: number;
    y: number;
  } | null>(null);

  const checkScrollLimits = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const timer = setTimeout(checkScrollLimits, 80);
    const observer = new ResizeObserver(() => checkScrollLimits());
    observer.observe(el);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [episodes, checkScrollLimits]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;

    const cardEl = el.querySelector(".episode-card");
    const scrollAmount = cardEl ? cardEl.clientWidth * 3 : el.clientWidth * 0.8;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    setShowAllEpisodesPopup(false);
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [activeSeason]);

  const isSeasonFullyWatched = useMemo(() => {
    if (episodes.length === 0) return false;
    return episodes.every((ep) =>
      watchedEpisodes.some((we) => we.season === activeSeason && we.number === ep.episodeNumber),
    );
  }, [episodes, watchedEpisodes, activeSeason]);

  const isEpisodeWatched = useCallback((episodeNumber: number) => {
    return watchedEpisodes.some((we) => we.season === activeSeason && we.number === episodeNumber);
  }, [watchedEpisodes, activeSeason]);

  const handleEpisodeClick = useCallback((episode: TvEpisode) => {
    onEpisodeClick(episode, activeSeason);
  }, [onEpisodeClick, activeSeason]);

  const handleEpisodeContextMenu = useCallback((episode: TvEpisode, clientX: number, clientY: number) => {
    setContextMenu({ episode, x: clientX, y: clientY });
  }, []);

  return (
    <section className="season-episodes-section">
      <h2 className="season-episodes-title">{t("seasons.episodeSelection")}</h2>

      <SeasonEpisodesToolbar
        activeSeason={activeSeason}
        numberOfSeasons={numberOfSeasons}
        showSeasonPopover={showSeasonPopover}
        setShowSeasonPopover={setShowSeasonPopover}
        setActiveSeason={setActiveSeason}
        isSeasonFullyWatched={isSeasonFullyWatched}
        episodes={episodes}
        showWatchPopover={showWatchPopover}
        setShowWatchPopover={setShowWatchPopover}
        toggleSeasonWatched={toggleSeasonWatched}
        onOpenMultiPicker={onOpenMultiPicker}
        showAllEpisodes={!loading && hasMoreThanCarousel}
        onOpenAllEpisodes={() => setShowAllEpisodesPopup(true)}
      />

      {loading ? (
        <Grid
          minWidth="17.5rem"
          gap="1rem"
          className="season-episodes-skeleton-grid"
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="episode-card-skeleton"
            />
          ))}
        </Grid>
      ) : episodes.length > 0 ? (
        <div className="episodes-carousel-wrapper">
          {canScrollLeft && (
            <IconButton
              className="carousel-nav-btn left"
              onClick={() => handleScroll("left")}
              aria-label={t("seasons.scrollBack")}
            >
              <ChevronLeft size="1.25rem" />
            </IconButton>
          )}

          <ScrollView
            orientation="horizontal"
            className="episodes-scroll-viewport"
            trackClassName="episodes-scroll-container"
            viewportRef={scrollRef}
            onScroll={checkScrollLimits}
          >
            {episodes.slice(0, CAROUSEL_LIMIT).map((ep) => {
              const watched = isEpisodeWatched(ep.episodeNumber);
              return (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  onClick={handleEpisodeClick}
                  isActive={selectedEpisode?.episode.id === ep.id}
                  isWatched={watched}
                  onContextMenu={handleEpisodeContextMenu}
                />
              );
            })}
            {hasMoreThanCarousel && (
              <div
                className="episode-card episode-card-all"
                role="button"
                tabIndex={0}
                onClick={() => setShowAllEpisodesPopup(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowAllEpisodesPopup(true);
                  }
                }}
              >
                <div className="episode-still-wrap episode-card-all-tile">
                  <LayoutList size="1.75rem" />
                  <span className="episode-card-all-label">{t("seasons.allEpisodes")}</span>
                  <span className="episode-card-all-count">{episodes.length}</span>
                </div>
              </div>
            )}
          </ScrollView>

          {canScrollRight && (
            <IconButton
              className="carousel-nav-btn right"
              onClick={() => handleScroll("right")}
              aria-label={t("seasons.scrollForward")}
            >
              <ChevronRight size="1.25rem" />
            </IconButton>
          )}
        </div>
      ) : (
        <div className="season-episodes-empty">{t("seasons.noEpisodes")}</div>
      )}

      {contextMenu && (
        <EpisodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isWatched={isEpisodeWatched(contextMenu.episode.episodeNumber)}
          onToggleWatched={() => {
            const watched = isEpisodeWatched(contextMenu.episode.episodeNumber);
            toggleEpisodeWatched?.(activeSeason, contextMenu.episode.episodeNumber, !watched);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showAllEpisodesPopup && (
        <EpisodesListPopup
          isOpen={showAllEpisodesPopup}
          onClose={() => setShowAllEpisodesPopup(false)}
          title={mediaTitle || t("seasons.episodeSelection")}
          seasonNumber={activeSeason}
          episodes={episodes}
          isEpisodeWatched={isEpisodeWatched}
        />
      )}
    </section>
  );
};

export default SeasonEpisodesSection;
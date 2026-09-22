import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import type { TvEpisode } from "../network/ApiTypes";
import type { ArmMediaSummary } from "../network/ArmTypes";
import { useArmEpisodeLayout } from "../hooks/useArmEpisodeLayout";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollView } from "./common/ScrollView";
import { Grid } from "./common/Grid";
import { IconButton } from "./ui";
import { SeasonEpisodesToolbar } from "./SeasonEpisodesToolbar";
import { EpisodeContextMenu } from "./EpisodeContextMenu";
import { EpisodesListPopup } from "./EpisodesListPopup";
import { LayoutList } from "lucide-react";
import { isEpisodeWatched as episodeIsWatched } from "../features/arm/episodeHistoryModel";

// Cap the carousel so long seasons don't render hundreds of cards or force endless scrolling.
// When a season has more episodes, the last slot becomes an "All" card that opens the full list popup.
const CAROUSEL_LIMIT = 15;

interface SeasonEpisodesSectionProps {
  mediaId: number;
  mediaTitle?: string;
  numberOfSeasons: number;
  arm?: ArmMediaSummary;
  /** ARM season layout is TV-only; movies keep the legacy path untouched. */
  armEnabled?: boolean;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number) => void;
  selectedEpisode?: { episode: TvEpisode; seasonNumber: number } | null;
  watchedEpisodes?: { season: number; number: number }[];
  watchedEpisodeIds?: string[];
  toggleEpisodeWatched?: (episode: TvEpisode, nextState: boolean) => Promise<void>;
  toggleSeasonWatched?: (
    seasonNumber: number | undefined,
    episodesList: TvEpisode[],
    nextState: boolean,
    groupTitle?: string,
  ) => Promise<void>;
  onOpenMultiPicker?: () => void;
}

export const SeasonEpisodesSection: React.FC<SeasonEpisodesSectionProps> = ({
  mediaId,
  numberOfSeasons,
  arm,
  armEnabled = true,
  onEpisodeClick,
  selectedEpisode,
  watchedEpisodes = [],
  watchedEpisodeIds = [],
  toggleEpisodeWatched,
  toggleSeasonWatched,
  onOpenMultiPicker,
  mediaTitle,
}) => {
  const { t } = useTranslation("media");
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [showSeasonPopover, setShowSeasonPopover] = useState(false);
  const [showWatchPopover, setShowWatchPopover] = useState(false);
  const [showAllEpisodesPopup, setShowAllEpisodesPopup] = useState(false);

  const armLayout = useArmEpisodeLayout({ tmdbId: mediaId, summary: arm, enabled: armEnabled });
  const usesArmLayout = armLayout.status === "arm" || armLayout.status === "provisional";
  // Preload the legacy season while ARM resolves so an older/uncovered Gateway falls back without a
  // second network waterfall. Once an ARM layout wins, the legacy request is disabled and cached.
  const legacySeason = useSeasonEpisodes(mediaId, activeSeason, !usesArmLayout);
  // Untitled season groups arrive with an empty title and a fallback descriptor — finalize the
  // localized "Season {number}" string here so the mapper stays i18n-free.
  const armGroups = useMemo(
    () => armLayout.groups.map((group) => ({
      ...group,
      title: group.title || (group.titleFallback?.kind === "season"
        ? t("seasons.season", { number: group.titleFallback.number ?? group.displayNumber ?? 0 })
        : group.title),
    })),
    [armLayout.groups, t],
  );
  const activeGroup = armGroups.find((group) => group.id === activeGroupId) ?? armGroups[0];
  const episodes = useMemo(
    () => usesArmLayout ? activeGroup?.episodes ?? [] : legacySeason.episodes,
    [activeGroup, legacySeason.episodes, usesArmLayout],
  );
  const loading = armLayout.status === "loading" || (!usesArmLayout && legacySeason.loading);
  const hasMoreThanCarousel = episodes.length > CAROUSEL_LIMIT;

  useEffect(() => {
    if (!usesArmLayout || armGroups.length === 0) return;
    if (!activeGroupId || !armGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(armGroups[0].id);
    }
  }, [activeGroupId, armGroups, usesArmLayout]);

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
  }, [activeGroupId, activeSeason]);

  const isSeasonFullyWatched = useMemo(() => {
    if (episodes.length === 0) return false;
    return episodes.every((episode) => episodeIsWatched(episode, {
      episodeIds: watchedEpisodeIds,
      legacyCoordinates: watchedEpisodes,
    }));
  }, [episodes, watchedEpisodeIds, watchedEpisodes]);

  const isEpisodeWatched = useCallback((episode: TvEpisode) => {
    return episodeIsWatched(episode, {
      episodeIds: watchedEpisodeIds,
      legacyCoordinates: watchedEpisodes,
    });
  }, [watchedEpisodeIds, watchedEpisodes]);

  const handleEpisodeClick = useCallback((episode: TvEpisode) => {
    onEpisodeClick(episode, episode.seasonNumber ?? activeSeason);
  }, [onEpisodeClick, activeSeason]);

  const handleEpisodeContextMenu = useCallback((episode: TvEpisode, clientX: number, clientY: number) => {
    setContextMenu({ episode, x: clientX, y: clientY });
  }, []);

  const handleToggleDisplayedGroup = useCallback(async (
    seasonNumber: number,
    episodesList: TvEpisode[],
    nextState: boolean,
  ) => {
    if (!toggleSeasonWatched) return;
    await toggleSeasonWatched(
      usesArmLayout ? undefined : seasonNumber,
      episodesList,
      nextState,
      usesArmLayout ? activeGroup?.title : undefined,
    );
  }, [activeGroup?.title, toggleSeasonWatched, usesArmLayout]);

  return (
    <section className="season-episodes-section">
      <h2 className="season-episodes-title">{t("seasons.episodeSelection")}</h2>

      <SeasonEpisodesToolbar
        activeSeason={activeSeason}
        numberOfSeasons={numberOfSeasons}
        episodeGroups={usesArmLayout ? armGroups : undefined}
        activeGroupId={activeGroup?.id}
        setActiveGroupId={setActiveGroupId}
        showSeasonPopover={showSeasonPopover}
        setShowSeasonPopover={setShowSeasonPopover}
        setActiveSeason={setActiveSeason}
        isSeasonFullyWatched={isSeasonFullyWatched}
        episodes={episodes}
        showWatchPopover={showWatchPopover}
        setShowWatchPopover={setShowWatchPopover}
        toggleSeasonWatched={handleToggleDisplayedGroup}
        onOpenMultiPicker={armLayout.status === "arm" ? undefined : onOpenMultiPicker}
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
              const watched = isEpisodeWatched(ep);
              return (
                <EpisodeCard
                  key={ep.armEpisodeId ?? `${activeGroup?.id ?? activeSeason}-${ep.armOrdinal ?? ep.id}`}
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
          isWatched={isEpisodeWatched(contextMenu.episode)}
          onToggleWatched={() => {
            const watched = isEpisodeWatched(contextMenu.episode);
            void toggleEpisodeWatched?.(contextMenu.episode, !watched);
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
          seasonNumber={activeGroup?.displayNumber ?? activeSeason}
          groupTitle={usesArmLayout ? activeGroup?.title : undefined}
          episodes={episodes}
          isEpisodeWatched={isEpisodeWatched}
        />
      )}
    </section>
  );
};

export default SeasonEpisodesSection;

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import type { TvEpisode } from "../network/ApiTypes";
import type { ArmMediaSummary } from "../network/ArmTypes";
import { useArmEpisodeLayout } from "../hooks/useArmEpisodeLayout";
import { EpisodeCard } from "./EpisodeCard";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  ListOrdered,
} from "lucide-react";
import { Grid } from "./common/Grid";
import { Button, IconButton, PopoverItem } from "./ui";
import { SeasonEpisodesToolbar } from "./SeasonEpisodesToolbar";
import { EpisodeContextMenu } from "./EpisodeContextMenu";
import { isEpisodeWatched as episodeIsWatched } from "../features/arm/episodeHistoryModel";
import { finalizeGroupTitle, orderGroupsByKind } from "./seasonGroupLabels";
import {
  clampEpisodePage,
  getEpisodeGridColumnCount,
  getEpisodePageSize,
  rankEpisodes,
  type EpisodeSortOption,
} from "../features/mediaDetails/episodePagination";

interface SeasonEpisodesSectionProps {
  mediaId: number;
  mediaTitle?: string;
  numberOfSeasons: number;
  arm?: ArmMediaSummary;
  /** ARM season layout is TV-only; movies keep the legacy path untouched. */
  armEnabled?: boolean;
  /** Canonical deep link (?g= on /media/p): the entry the page opens on. */
  initialGroupId?: string;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number, groupTitle?: string) => void;
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
  initialGroupId,
  onEpisodeClick,
  selectedEpisode,
  watchedEpisodes = [],
  watchedEpisodeIds = [],
  toggleEpisodeWatched,
  toggleSeasonWatched,
  onOpenMultiPicker,
}) => {
  const { t } = useTranslation("media");
  const [activeSeason, setActiveSeason] = useState(1);
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [showSeasonPopover, setShowSeasonPopover] = useState(false);
  const [showWatchPopover, setShowWatchPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [sortOption, setSortOption] = useState<EpisodeSortOption>("numberAsc");
  const [columnCount, setColumnCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);

  const armLayout = useArmEpisodeLayout({ tmdbId: mediaId, summary: arm, enabled: armEnabled });
  const usesArmLayout = armLayout.status === "arm";
  // Preload the legacy season while ARM resolves so an older/uncovered Gateway falls back without a
  // second network waterfall. Once an ARM layout wins, the legacy request is disabled and cached.
  const legacySeason = useSeasonEpisodes(mediaId, activeSeason, !usesArmLayout);
  // Localize source-owned season/part descriptors and generic fallbacks here. Source titles
  // retain named arcs; kind ordering keeps the main releases ahead of specials/movies/ova.
  const armGroups = useMemo(
    () => orderGroupsByKind(armLayout.groups).map((group) => ({
      ...group,
      title: finalizeGroupTitle(group, t),
    })),
    [armLayout.groups, t],
  );
  const activeGroup = armGroups.find((group) => group.id === activeGroupId) ?? armGroups[0];
  const episodes = useMemo(
    () => usesArmLayout ? activeGroup?.episodes ?? [] : legacySeason.episodes,
    [activeGroup, legacySeason.episodes, usesArmLayout],
  );
  const loading = armLayout.status === "loading" || (!usesArmLayout && legacySeason.loading);

  const lastAppliedGroupLink = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!usesArmLayout || armGroups.length === 0) return;
    // The canonical deep link wins on arrival and on change; between navigations the user's
    // own tab clicks stay untouched.
    const linked = initialGroupId && armGroups.some((group) => group.id === initialGroupId)
      ? initialGroupId
      : undefined;
    if (linked) {
      if (lastAppliedGroupLink.current !== linked) {
        lastAppliedGroupLink.current = linked;
        if (activeGroupId !== linked) setActiveGroupId(linked);
      }
      return;
    }
    lastAppliedGroupLink.current = undefined;
    if (!activeGroupId || !armGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(armGroups[0].id);
    }
  }, [activeGroupId, armGroups, usesArmLayout, initialGroupId]);

  const gridRef = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    episode: TvEpisode;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const updateColumnCount = () => {
      const nextColumnCount = getEpisodeGridColumnCount(el.clientWidth);
      setColumnCount((current) => current === nextColumnCount ? current : nextColumnCount);
    };
    updateColumnCount();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateColumnCount);
      return () => window.removeEventListener("resize", updateColumnCount);
    }

    const observer = new ResizeObserver(updateColumnCount);
    observer.observe(el);
    return () => observer.disconnect();
  }, [episodes.length, loading]);

  useEffect(() => {
    setCurrentPage(0);
    setShowSortPopover(false);
  }, [activeGroupId, activeSeason, sortOption]);

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

  const rankedEpisodes = useMemo(
    () => rankEpisodes(episodes, sortOption, isEpisodeWatched),
    [episodes, isEpisodeWatched, sortOption],
  );
  const pageSize = getEpisodePageSize(columnCount);
  const totalPages = Math.max(1, Math.ceil(rankedEpisodes.length / pageSize));
  const safeCurrentPage = clampEpisodePage(currentPage, rankedEpisodes.length, pageSize);
  const visibleEpisodes = rankedEpisodes.slice(safeCurrentPage * pageSize, (safeCurrentPage + 1) * pageSize);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) setCurrentPage(safeCurrentPage);
  }, [currentPage, safeCurrentPage]);

  const handleEpisodeClick = useCallback((episode: TvEpisode) => {
    onEpisodeClick(episode, episode.seasonNumber ?? activeSeason, usesArmLayout ? activeGroup?.title : undefined);
  }, [onEpisodeClick, activeSeason, usesArmLayout, activeGroup?.title]);

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
      <div className="season-episodes-heading-row">
        <h2 className="season-episodes-title">{t("seasons.episodeSelection")}</h2>
        <div className="episode-sort-wrapper">
          <Button
            variant="glass"
            className="episode-sort-trigger"
            onClick={() => setShowSortPopover((current) => !current)}
            aria-expanded={showSortPopover}
            aria-haspopup="menu"
          >
            <ArrowDownWideNarrow size="0.9375rem" />
            <span>{t(`seasons.sort.${sortOption}`)}</span>
            <ChevronDown size="0.875rem" />
          </Button>

          {showSortPopover && (
            <>
              <div className="popover-overlay" onClick={() => setShowSortPopover(false)} />
              <div className="episode-sort-menu" role="menu">
                {([
                  ["numberAsc", ListOrdered],
                  ["releaseDesc", CalendarDays],
                  ["unwatchedFirst", EyeOff],
                ] as const).map(([option, SortIcon]) => (
                  <PopoverItem
                    key={option}
                    active={sortOption === option}
                    onClick={() => {
                      setSortOption(option);
                      setShowSortPopover(false);
                    }}
                  >
                    <div className="episode-sort-item-content">
                      <SortIcon size="0.9375rem" />
                      <span>{t(`seasons.sort.${option}`)}</span>
                    </div>
                    {sortOption === option && <Check size="0.9375rem" />}
                  </PopoverItem>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

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
      />

      {loading ? (
        <Grid
          minWidth="17.5rem"
          gap="1rem"
          className="season-episodes-skeleton-grid"
        >
          {Array.from({ length: Math.min(10, pageSize) }).map((_, idx) => (
            <div
              key={idx}
              className="episode-card-skeleton"
            />
          ))}
        </Grid>
      ) : episodes.length > 0 ? (
        <>
          <div ref={gridRef} className="episodes-page-grid">
            {visibleEpisodes.map((ep) => {
              const watched = isEpisodeWatched(ep);
              return (
                <EpisodeCard
                  key={ep.armEpisodeId ?? `${activeGroup?.id ?? activeSeason}-${ep.armNumber ?? ep.id}`}
                  episode={ep}
                  onClick={handleEpisodeClick}
                  isActive={selectedEpisode?.episode.id === ep.id}
                  isWatched={watched}
                  onContextMenu={handleEpisodeContextMenu}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav className="episode-pagination" aria-label={t("seasons.paginationLabel")}>
              <span className="episode-pagination-label">
                {t("seasons.pageOf", { current: safeCurrentPage + 1, total: totalPages })}
              </span>
              <IconButton
                className="episode-pagination-button"
                disabled={safeCurrentPage === 0}
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                aria-label={t("seasons.previousPage")}
              >
                <ChevronLeft size="1.125rem" />
              </IconButton>
              <IconButton
                className="episode-pagination-button"
                disabled={safeCurrentPage >= totalPages - 1}
                onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
                aria-label={t("seasons.nextPage")}
              >
                <ChevronRight size="1.125rem" />
              </IconButton>
            </nav>
          )}
        </>
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

    </section>
  );
};

export default SeasonEpisodesSection;

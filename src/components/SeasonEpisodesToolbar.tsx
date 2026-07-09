import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Tv, Check, Eye, ListTodo } from "lucide-react";
import type { TvEpisode } from "../network/ApiTypes";
import { Button, IconButton, PopoverItem } from "./ui";

interface SeasonEpisodesToolbarProps {
  activeSeason: number;
  numberOfSeasons: number;
  showSeasonPopover: boolean;
  setShowSeasonPopover: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSeason: (season: number) => void;
  isSeasonFullyWatched: boolean;
  episodes: TvEpisode[];
  showWatchPopover: boolean;
  setShowWatchPopover: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSeasonWatched?: (seasonNumber: number, episodesList: TvEpisode[], nextState: boolean) => Promise<void>;
  onOpenMultiPicker?: () => void;
}

export const SeasonEpisodesToolbar: React.FC<SeasonEpisodesToolbarProps> = ({
  activeSeason,
  numberOfSeasons,
  showSeasonPopover,
  setShowSeasonPopover,
  setActiveSeason,
  isSeasonFullyWatched,
  episodes,
  showWatchPopover,
  setShowWatchPopover,
  toggleSeasonWatched,
  onOpenMultiPicker,
}) => {
  const { t } = useTranslation("media");

  return (
    <div className="season-selector-row">
      <div className="season-select-wrapper">
        <Button
          variant="glass"
          className="season-select-trigger-btn"
          onClick={() => setShowSeasonPopover((prev) => !prev)}
          aria-expanded={showSeasonPopover}
        >
          <span>{t("seasons.season", { number: activeSeason })}</span>
          <ChevronDown size="0.875rem" />
        </Button>

        {showSeasonPopover && (
          <>
            <div className="popover-overlay" onClick={() => setShowSeasonPopover(false)} />
            <div className="season-popover-menu">
              {Array.from({ length: numberOfSeasons }).map((_, idx) => {
                const sNum = idx + 1;
                return (
                  <PopoverItem
                    key={sNum}
                    active={activeSeason === sNum}
                    className="season-popover-item"
                    onClick={() => {
                      setActiveSeason(sNum);
                      setShowSeasonPopover(false);
                    }}
                  >
                    <Tv size="1rem" className="season-item-icon" />
                    <span>{t("seasons.season", { number: sNum })}</span>
                    {activeSeason === sNum && <Check size="1rem" className="season-active-check" />}
                  </PopoverItem>
                );
              })}
            </div>
          </>
        )}
      </div>

      {toggleSeasonWatched && (
        <div className="season-watch-wrapper">
          <IconButton
            className="season-watch-trigger-btn"
            onClick={() => setShowWatchPopover((prev) => !prev)}
            aria-expanded={showWatchPopover}
            title={t("seasons.selectAndWatch")}
            aria-label={t("seasons.selectAndWatch")}
          >
            {isSeasonFullyWatched ? <Check size="1.125rem" /> : <Eye size="1.125rem" />}
            <ChevronDown size="0.75rem" />
          </IconButton>

          {showWatchPopover && (
            <>
              <div className="popover-overlay" onClick={() => setShowWatchPopover(false)} />
              <div className="watch-popover-menu">
                <div className="popover-header">{t("seasons.episodeSelection")}</div>
                <PopoverItem
                  className="watch-popover-item"
                  onClick={() => {
                    toggleSeasonWatched(activeSeason, episodes, !isSeasonFullyWatched);
                    setShowWatchPopover(false);
                  }}
                >
                  <Eye size="1rem" className="watch-item-icon" />
                  <span>{isSeasonFullyWatched ? t("seasons.unmark") : t("seasons.markSeason")}</span>
                </PopoverItem>
                <PopoverItem
                  className="watch-popover-item"
                  onClick={() => {
                    setShowWatchPopover(false);
                    onOpenMultiPicker?.();
                  }}
                >
                  <ListTodo size="1rem" className="watch-item-icon" />
                  <span>{t("seasons.markSelectively")}</span>
                </PopoverItem>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
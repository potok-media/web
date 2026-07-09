import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Filter, ChevronDown, Check } from "lucide-react";
import { Overlay } from "../common/Overlay";
import { Button, PopoverItem } from "../ui";
import { useStreamFilterPopoverCoords } from "./useStreamFilterPopoverCoords";

interface StreamFilterFilterMenuProps {
  qualityFilter: string;
  setQualityFilter: (quality: string) => void;
  activeTracker: string;
  setActiveTracker: (tracker: string) => void;
  trackers: string[];
  trackerLabel: string;
  allTrackersLabel: string;
  seasonFilter: string;
  setSeasonFilter?: (season: string) => void;
  availableSeasons: number[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const StreamFilterFilterMenu: React.FC<StreamFilterFilterMenuProps> = ({
  qualityFilter,
  setQualityFilter,
  activeTracker,
  setActiveTracker,
  trackers,
  trackerLabel,
  allTrackersLabel,
  seasonFilter,
  setSeasonFilter,
  availableSeasons,
  isOpen,
  onToggle,
  onClose,
}) => {
  const { t } = useTranslation("streams");
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterCoords = useStreamFilterPopoverCoords(isOpen, filterTriggerRef);

  const hasActiveFilters =
    qualityFilter !== "all" || activeTracker !== "all" || seasonFilter !== "all";

  return (
    <div className="filter-popover-wrapper">
      <Button
        ref={filterTriggerRef}
        variant="glass"
        className="filter-btn-trigger-relative"
        onClick={onToggle}
      >
        <Filter size="0.875rem" />
        <span className="filter-btn-text">{t("filter.title")}</span>
        <ChevronDown size="0.875rem" />
        {hasActiveFilters && <span className="filter-badge-dot" />}
      </Button>

      <Overlay
        open={isOpen}
        onClose={onClose}
        styled={false}
        variant="popover"
        backdropClassName="filter-popover-overlay"
        className="filter-popover filter-popover-menu-filter"
        popoverStyle={{
          position: "fixed",
          top: `${filterCoords.top}px`,
          right: `${filterCoords.right}px`,
          zIndex: 999999,
          marginTop: "0.375rem",
        }}
      >
        <div className="filter-section-title">{t("filter.quality")}</div>
        <div className="filter-popover-column">
          {["all", "2160p", "1080p", "720p", "480p"].map((q) => (
            <PopoverItem
              key={q}
              active={qualityFilter === q}
              onClick={() => setQualityFilter(q)}
            >
              <span>{q === "all" ? t("filter.allQualities") : q}</span>
              {qualityFilter === q && <Check size="0.875rem" className="filter-popover-check" />}
            </PopoverItem>
          ))}
        </div>

        {availableSeasons && availableSeasons.length > 0 && (
          <>
            <div className="filter-popover-divider" />
            <div className="filter-section-title">{t("filter.season", "Season")}</div>
            <div className="filter-popover-column">
              <PopoverItem
                active={seasonFilter === "all"}
                onClick={() => setSeasonFilter?.("all")}
              >
                <span>{t("filter.allSeasons", "All seasons")}</span>
                {seasonFilter === "all" && <Check size="0.875rem" className="filter-popover-check" />}
              </PopoverItem>
              {availableSeasons.map((s) => (
                <PopoverItem
                  key={s}
                  active={seasonFilter === String(s)}
                  onClick={() => setSeasonFilter?.(String(s))}
                >
                  <span>{t("filter.seasonNumber", { number: s, defaultValue: `Season ${s}` })}</span>
                  {seasonFilter === String(s) && <Check size="0.875rem" className="filter-popover-check" />}
                </PopoverItem>
              ))}
              <PopoverItem
                active={seasonFilter === "none"}
                onClick={() => setSeasonFilter?.("none")}
              >
                <span>{t("filter.noSeason", "No season")}</span>
                {seasonFilter === "none" && <Check size="0.875rem" className="filter-popover-check" />}
              </PopoverItem>
            </div>
          </>
        )}

        <div className="filter-popover-divider" />

        <div className="filter-section-title">{trackerLabel}</div>
        <div className="filter-popover-scroll-area">
          <PopoverItem
            active={activeTracker === "all"}
            onClick={() => setActiveTracker("all")}
          >
            <span>{allTrackersLabel}</span>
            {activeTracker === "all" && <Check size="0.875rem" className="filter-popover-check" />}
          </PopoverItem>
          {trackers.map((tr) => (
            <PopoverItem
              key={tr}
              active={activeTracker === tr}
              onClick={() => setActiveTracker(tr)}
            >
              <span>{tr}</span>
              {activeTracker === tr && <Check size="0.875rem" className="filter-popover-check" />}
            </PopoverItem>
          ))}
        </div>

        {hasActiveFilters && (
          <>
            <div className="filter-popover-divider" />
            <Button
              variant="ghost"
              fullWidth
              className="popover-reset-btn"
              onClick={() => {
                setQualityFilter("all");
                setActiveTracker("all");
                setSeasonFilter?.("all");
                onClose();
              }}
            >
              {t("filter.resetAll")}
            </Button>
          </>
        )}
      </Overlay>
    </div>
  );
};
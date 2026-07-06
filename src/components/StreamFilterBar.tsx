import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, Flame, Calendar, ArrowUpCircle, ArrowDownCircle, ChevronDown, Check, Filter } from "lucide-react";
import { FocusableButton } from "./common/TVNavigation";
import { Overlay } from "./common/Overlay";

interface StreamFilterBarProps {
  id?: string;
  countLabel: string;
  qualityFilter: string;
  setQualityFilter: (quality: string) => void;
  activeTracker: string;
  setActiveTracker: (tracker: string) => void;
  trackers: string[];
  onRefresh: () => void;
  showSort?: boolean;
  sortOption?: string;
  setSortOption?: (opt: string) => void;
  trackerLabel?: string;
  allTrackersLabel?: string;
  seasonFilter?: string;
  setSeasonFilter?: (season: string) => void;
  availableSeasons?: number[];
}

const SORT_KEYS = ["seedersDesc", "publishDateDesc", "sizeDesc", "sizeAsc"] as const;

const FIRST_SORT_KEY = SORT_KEYS[0];

export const StreamFilterBar: React.FC<StreamFilterBarProps> = React.memo(({
  id,
  countLabel,
  sortOption = "seedersDesc",
  setSortOption,
  qualityFilter,
  setQualityFilter,
  activeTracker,
  setActiveTracker,
  trackers,
  onRefresh,
  showSort = true,
  trackerLabel,
  allTrackersLabel,
  seasonFilter = "all",
  setSeasonFilter,
  availableSeasons = [],
}) => {
  const { t } = useTranslation("streams");
  const sortLabels: Record<string, string> = {
    seedersDesc: t("sort.seedersDesc"),
    publishDateDesc: t("sort.publishDateDesc"),
    sizeDesc: t("sort.sizeDesc"),
    sizeAsc: t("sort.sizeAsc"),
  };
  const resolvedTrackerLabel = trackerLabel ?? t("filter.trackerLabel");
  const resolvedAllTrackersLabel = allTrackersLabel ?? t("filter.allTrackers");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  const [sortCoords, setSortCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [filterCoords, setFilterCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateSortCoords = () => {
    if (sortTriggerRef.current) {
      const rect = sortTriggerRef.current.getBoundingClientRect();
      setSortCoords({ top: rect.bottom, right: window.innerWidth - rect.right });
    }
  };

  const updateFilterCoords = () => {
    if (filterTriggerRef.current) {
      const rect = filterTriggerRef.current.getBoundingClientRect();
      setFilterCoords({ top: rect.bottom, right: window.innerWidth - rect.right });
    }
  };

  useEffect(() => {
    if (sortOpen) {
      updateSortCoords();
      window.addEventListener("resize", updateSortCoords);
      window.addEventListener("scroll", updateSortCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateSortCoords);
      window.removeEventListener("scroll", updateSortCoords, true);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (filterOpen) {
      updateFilterCoords();
      window.addEventListener("resize", updateFilterCoords);
      window.addEventListener("scroll", updateFilterCoords, true);
    }
    return () => {
      window.removeEventListener("resize", updateFilterCoords);
      window.removeEventListener("scroll", updateFilterCoords, true);
    };
  }, [filterOpen]);

  return (
    <header className="streams-results-header" id={id}>
      <div className="streams-results-count">
        {countLabel}
      </div>

      <div className="streams-header-actions">
        {/* Refresh Button */}
        <FocusableButton
          className="btn-glass filter-btn-trigger"
          onClick={onRefresh}
        >
          <RotateCw size="0.875rem" />
          <span className="filter-btn-text">{t("actions.refresh")}</span>
        </FocusableButton>

        {/* Sorting Dropdown */}
        {showSort && setSortOption && (
          <div className="filter-popover-wrapper">
            <FocusableButton
              ref={sortTriggerRef}
              className="btn-glass filter-btn-trigger"
              onClick={() => {
                setSortOpen(!sortOpen);
                setFilterOpen(false);
              }}
            >
              {sortOption === "seedersDesc" && <Flame size="0.875rem" />}
              {sortOption === "publishDateDesc" && <Calendar size="0.875rem" />}
              {sortOption === "sizeDesc" && <ArrowUpCircle size="0.875rem" />}
              {sortOption === "sizeAsc" && <ArrowDownCircle size="0.875rem" />}
              <span className="filter-btn-text">{sortLabels[sortOption]}</span>
              <ChevronDown size="0.875rem" />
            </FocusableButton>

            <Overlay
              open={sortOpen}
              onClose={() => setSortOpen(false)}
              focusKey="SORT_POPOVER"
              initialFocusKey={`SORT_ITEM_${FIRST_SORT_KEY}`}
              styled={false}
              variant="popover"
              backdropClassName="filter-popover-overlay"
              className="filter-popover filter-popover-menu-sort"
              popoverStyle={{ position: "fixed", top: `${sortCoords.top}px`, right: `${sortCoords.right}px`, zIndex: 999999, marginTop: "0.375rem" }}
            >
              {SORT_KEYS.map((key) => (
                <FocusableButton
                  key={key}
                  focusKey={`SORT_ITEM_${key}`}
                  className={`popover-item ${sortOption === key ? "active" : ""}`}
                  onClick={() => {
                    setSortOption(key);
                    setSortOpen(false);
                  }}
                  style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div className="filter-popover-item-content">
                    {key === "seedersDesc" && <Flame size="0.875rem" />}
                    {key === "publishDateDesc" && <Calendar size="0.875rem" />}
                    {key === "sizeDesc" && <ArrowUpCircle size="0.875rem" />}
                    {key === "sizeAsc" && <ArrowDownCircle size="0.875rem" />}
                    <span>{sortLabels[key]}</span>
                  </div>
                  {sortOption === key && <Check size="0.875rem" className="filter-popover-check" />}
                </FocusableButton>
              ))}
            </Overlay>
          </div>
        )}

        {/* Filters Dropdown */}
        <div className="filter-popover-wrapper">
          <FocusableButton
            ref={filterTriggerRef}
            className="btn-glass filter-btn-trigger-relative"
            onClick={() => {
              setFilterOpen(!filterOpen);
              setSortOpen(false);
            }}
          >
            <Filter size="0.875rem" />
            <span className="filter-btn-text">{t("filter.title")}</span>
            <ChevronDown size="0.875rem" />
            {(qualityFilter !== "all" || activeTracker !== "all" || seasonFilter !== "all") && (
              <span className="filter-badge-dot" />
            )}
          </FocusableButton>

          <Overlay
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            focusKey="FILTER_POPOVER"
            initialFocusKey="FILTER_QUALITY_all"
            styled={false}
            variant="popover"
            backdropClassName="filter-popover-overlay"
            className="filter-popover filter-popover-menu-filter"
            popoverStyle={{ position: "fixed", top: `${filterCoords.top}px`, right: `${filterCoords.right}px`, zIndex: 999999, marginTop: "0.375rem" }}
          >
            <div className="filter-section-title">{t("filter.quality")}</div>
            <div className="filter-popover-column">
              {["all", "2160p", "1080p", "720p", "480p"].map((q) => (
                <FocusableButton
                  key={q}
                  focusKey={`FILTER_QUALITY_${q}`}
                  className={`popover-item ${qualityFilter === q ? "active" : ""}`}
                  onClick={() => setQualityFilter(q)}
                  style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>{q === "all" ? t("filter.allQualities") : q}</span>
                  {qualityFilter === q && <Check size="0.875rem" className="filter-popover-check" />}
                </FocusableButton>
              ))}
            </div>

            {availableSeasons && availableSeasons.length > 0 && (
              <>
                <div className="filter-popover-divider" />
                <div className="filter-section-title">{t("filter.season", "Season")}</div>
                <div className="filter-popover-column">
                  <FocusableButton
                    focusKey="FILTER_SEASON_all"
                    className={`popover-item ${seasonFilter === "all" ? "active" : ""}`}
                    onClick={() => setSeasonFilter?.("all")}
                    style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>{t("filter.allSeasons", "All seasons")}</span>
                    {seasonFilter === "all" && <Check size="0.875rem" className="filter-popover-check" />}
                  </FocusableButton>
                  {availableSeasons.map((s) => (
                    <FocusableButton
                      key={s}
                      focusKey={`FILTER_SEASON_${s}`}
                      className={`popover-item ${seasonFilter === String(s) ? "active" : ""}`}
                      onClick={() => setSeasonFilter?.(String(s))}
                      style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <span>{t("filter.seasonNumber", { number: s, defaultValue: `Season ${s}` })}</span>
                      {seasonFilter === String(s) && <Check size="0.875rem" className="filter-popover-check" />}
                    </FocusableButton>
                  ))}
                  <FocusableButton
                    focusKey="FILTER_SEASON_none"
                    className={`popover-item ${seasonFilter === "none" ? "active" : ""}`}
                    onClick={() => setSeasonFilter?.("none")}
                    style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span>{t("filter.noSeason", "No season")}</span>
                    {seasonFilter === "none" && <Check size="0.875rem" className="filter-popover-check" />}
                  </FocusableButton>
                </div>
              </>
            )}

            <div className="filter-popover-divider" />

            <div className="filter-section-title">
              {resolvedTrackerLabel}
            </div>
            <div className="filter-popover-scroll-area" style={{ maxHeight: "10rem", overflowY: "auto" }}>
              <FocusableButton
                focusKey="FILTER_TRACKER_all"
                className={`popover-item ${activeTracker === "all" ? "active" : ""}`}
                onClick={() => setActiveTracker("all")}
                style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>
                  {resolvedAllTrackersLabel}
                </span>
                {activeTracker === "all" && <Check size="0.875rem" className="filter-popover-check" />}
              </FocusableButton>
              {trackers.map((tr) => (
                <FocusableButton
                  key={tr}
                  focusKey={`FILTER_TRACKER_${tr}`}
                  className={`popover-item ${activeTracker === tr ? "active" : ""}`}
                  onClick={() => setActiveTracker(tr)}
                  style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>{tr}</span>
                  {activeTracker === tr && <Check size="0.875rem" className="filter-popover-check" />}
                </FocusableButton>
              ))}
            </div>

            {(qualityFilter !== "all" || activeTracker !== "all" || seasonFilter !== "all") && (
              <>
                <div className="filter-popover-divider" />
                <FocusableButton
                  focusKey="FILTER_RESET"
                  className="popover-reset-btn"
                  onClick={() => {
                    setQualityFilter("all");
                    setActiveTracker("all");
                    setSeasonFilter?.("all");
                    setFilterOpen(false);
                  }}
                  style={{ width: "100%" }}
                >
                  {t("filter.resetAll")}
                </FocusableButton>
              </>
            )}
          </Overlay>
        </div>
      </div>
    </header>
  );
});

StreamFilterBar.displayName = "StreamFilterBar";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "./ui";
import type { StreamFilterBarProps } from "./streamFilterBar/streamFilterBarTypes";
import { StreamFilterFilterMenu } from "./streamFilterBar/StreamFilterFilterMenu";
import { StreamFilterRefreshButton } from "./streamFilterBar/StreamFilterRefreshButton";
import { StreamFilterSortMenu } from "./streamFilterBar/StreamFilterSortMenu";

export const StreamFilterBar: React.FC<StreamFilterBarProps> = React.memo(({
  id,
  countLabel,
  onBack,
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
  const resolvedTrackerLabel = trackerLabel ?? t("filter.trackerLabel");
  const resolvedAllTrackersLabel = allTrackersLabel ?? t("filter.allTrackers");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <header className="streams-results-header" id={id}>
      {onBack && (
        <IconButton
          className="streams-header-back"
          onClick={onBack}
          aria-label={t("actions.back")}
        >
          <ArrowLeft size="1.125rem" />
        </IconButton>
      )}
      <div className="streams-results-count">
        {countLabel}
      </div>

      <div className="streams-header-actions">
        <StreamFilterRefreshButton onRefresh={onRefresh} />

        {showSort && setSortOption && (
          <StreamFilterSortMenu
            sortOption={sortOption}
            setSortOption={setSortOption}
            isOpen={sortOpen}
            onToggle={() => {
              setSortOpen(!sortOpen);
              setFilterOpen(false);
            }}
            onClose={() => setSortOpen(false)}
          />
        )}

        <StreamFilterFilterMenu
          qualityFilter={qualityFilter}
          setQualityFilter={setQualityFilter}
          activeTracker={activeTracker}
          setActiveTracker={setActiveTracker}
          trackers={trackers}
          trackerLabel={resolvedTrackerLabel}
          allTrackersLabel={resolvedAllTrackersLabel}
          seasonFilter={seasonFilter}
          setSeasonFilter={setSeasonFilter}
          availableSeasons={availableSeasons}
          isOpen={filterOpen}
          onToggle={() => {
            setFilterOpen(!filterOpen);
            setSortOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      </div>
    </header>
  );
});

StreamFilterBar.displayName = "StreamFilterBar";
export default StreamFilterBar;
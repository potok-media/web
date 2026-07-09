export interface StreamFilterBarProps {
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

export const SORT_KEYS = ["seedersDesc", "publishDateDesc", "sizeDesc", "sizeAsc"] as const;

export type SortKey = (typeof SORT_KEYS)[number];
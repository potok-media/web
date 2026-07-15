export interface StreamFilterBarProps {
  id?: string;
  countLabel: string;
  onBack?: () => void; // shown as a back button in the header on mid-width viewports (info sidebar is hidden)
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
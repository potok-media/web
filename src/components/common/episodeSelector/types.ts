import type { SDKArmEpisodeLayoutResponse, SDKEpisodeBindingOverride, SDKFileOverrideEntry, SDKReleaseBindingTarget, SDKTvSeason } from "../../../sdk/src/types";
import type { ArmEpisodeAnnotationSummary } from "../../../network/ArmTypes";

export interface GenericEpisodeItem {
  id: string;
  season?: number;
  episode?: number;
  rawSeason?: number;
  rawEpisode?: number;
  workId?: string | null;
  episodeId?: string | null;
  orderingId?: string | null;
  groupId?: string | null;
  groupTitle?: string | null;
  groupDisplayNumber?: number;
  groupKind?: string | null;
  displayOrdinal?: string | null;
  episodeIds?: string[];
  targets?: SDKReleaseBindingTarget[];
  resolutionState?: "resolved" | "ambiguous" | "unresolved";
  confidence?: number;
  bindingMethod?: string | null;
  rawEvidence?: {
    kind?: string | null;
    season?: number | null;
    seasons?: number[];
    episode?: number | null;
    ovaNumber?: number | null;
  } | null;
  alternatives?: Array<{
    episodeId: string;
    orderingId: string;
    groupId: string;
    confidence: number;
    compatibility?: { season?: number | null; episode?: number | null } | null;
  }>;
  armAnnotation?: ArmEpisodeAnnotationSummary | null;
  title?: string;
  fileName?: string;
  stillPath?: string;
  airDate?: string;
  isWatched?: boolean;
  sizeLabel?: string;
  progressId?: string;
  audios: Array<{ id: string; name: string; url?: string }>;
  url?: string;
}

export interface EpisodeSourceSection {
  key: string;
  rawSeason: number | undefined;
  displayedSeason: number | undefined;
  unresolved: boolean;
  rawFirstEp: number;
  groupTitle?: string | null;
  groupDisplayNumber?: number;
  groupKind?: string | null;
  episodes: GenericEpisodeItem[];
}

export type FileOverrideMode = "anchor" | "pin";

export type FileOverrideEntry = SDKFileOverrideEntry;

export interface EpisodeSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  onStartEditing?: () => void;
  onApplyOverride?: (sourceSeason: number | null, targetSeason: number, offset: number) => void;
  onResetOverride?: (sourceSeason: number | null) => void;
  // Per-file overrides (opt-in — gated by the plugin's SDK `fileOverride` capability). When enabled the selector
  // shows per-row anchor/pin controls that map ONE torrent file to a (season, episode).
  fileOverrideEnabled?: boolean;
  fileMap?: Record<string, FileOverrideEntry>;
  onApplyFileOverride?: (fileId: string, season: number, episode: number, mode: FileOverrideMode) => void;
  onResetFileOverride?: (fileId: string) => void;
  armLayout?: SDKArmEpisodeLayoutResponse | null;
  armLayoutLoading?: boolean;
  armLayoutError?: boolean;
  onRetryArmLayout?: () => void;
  onApplyEpisodeBinding?: (override: SDKEpisodeBindingOverride) => void;
  seasonMap?: Record<string, { season: number; offset: number }>;
  seasons?: SDKTvSeason[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  // Plugin's own parse-quality verdict. When provided, it wins over the popup's generic numeric heuristic.
  parsingSuspect?: boolean;
  backdropSrc?: string;
  posterSrc?: string;
  mediaType?: string;
}

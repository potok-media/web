import type { SDKTvSeason } from "../../../sdk/src/types";

export interface GenericEpisodeItem {
  id: string;
  season: number;
  episode: number;
  rawSeason?: number;
  rawEpisode?: number;
  title?: string;
  fileName?: string;
  stillPath?: string;
  airDate?: string;
  isWatched?: boolean;
  sizeLabel?: string;
  audios: Array<{ id: string; name: string; url?: string }>;
  url?: string;
}

export interface EpisodeSourceSection {
  key: string;
  rawSeason: number | undefined;
  displayedSeason: number;
  rawFirstEp: number;
  episodes: GenericEpisodeItem[];
}

export type FileOverrideMode = "anchor" | "pin";

export interface FileOverrideEntry {
  season: number;
  episode: number;
  mode: string;
}

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
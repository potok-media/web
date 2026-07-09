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
  seasonMap?: Record<string, { season: number; offset: number }>;
  seasons?: SDKTvSeason[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  backdropSrc?: string;
  posterSrc?: string;
  mediaType?: string;
}
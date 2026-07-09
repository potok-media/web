import type { MutableRefObject } from "react";
import type { HUDType } from "../../context/hudContextState";
import type { MediaCard } from "../../network/ApiTypes";

export interface UseMediaDetailsProps {
  mediaType?: string;
  mediaId?: number;
  playParam?: string | null;
  onNavigateToStreams: (season?: number, episode?: number) => void;
  showHUD: (type: HUDType, message: string) => void;
}

export interface MediaDetailsRefs {
  mediaRef: MutableRefObject<MediaCard | null>;
  lastFetchTimeRef: MutableRefObject<number>;
  onNavigateToStreamsRef: MutableRefObject<UseMediaDetailsProps["onNavigateToStreams"]>;
  showHUDRef: MutableRefObject<UseMediaDetailsProps["showHUD"]>;
}

export interface EpisodeSelection {
  season: number;
  number: number;
}

export interface UseMediaDetailsActionsParams {
  media: MediaCard | null;
  inWatchlist: boolean;
  isFavorite: boolean;
  isWatched: boolean;
  setInWatchlist: (value: boolean) => void;
  setIsFavorite: (value: boolean) => void;
  setIsWatched: (value: boolean) => void;
  showHUDRef: MutableRefObject<(type: HUDType, message: string) => void>;
  refetch: (silent?: boolean) => Promise<void>;
  t: import("i18next").TFunction;
}
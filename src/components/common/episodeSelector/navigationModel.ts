import type { EpisodeSelectorPresentation } from "./types";

interface NavigationModelParams {
  presentation: EpisodeSelectorPresentation;
  isEditing: boolean;
  repairMode: boolean;
}

export interface EpisodeSelectorNavigationModel {
  isNestedView: boolean;
  showBackNavigation: boolean;
  showCloseNavigation: boolean;
}

export function getEpisodeSelectorNavigationModel({
  presentation,
  isEditing,
  repairMode,
}: NavigationModelParams): EpisodeSelectorNavigationModel {
  const isPlaylist = presentation === "playlist";
  const isNestedView = isEditing || repairMode;
  return {
    isNestedView,
    showBackNavigation: !isPlaylist || isNestedView,
    showCloseNavigation: isPlaylist,
  };
}

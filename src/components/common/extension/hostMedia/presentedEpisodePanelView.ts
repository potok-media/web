import type { GenericEpisodeItem } from "../../episodeSelector/types";
import { orderItemsByIds } from "../../../../utils/queueOrder";

/** Minimal playback playlist snapshot the panel view derives its state from. */
export interface PlaylistSnapshot {
  playlist?: ReadonlyArray<{ id?: string | number | null } | null | undefined> | null;
  playlistIndex?: number | null;
}

export interface PresentedEpisodePanelView {
  episodes: GenericEpisodeItem[];
  activeEpisodeId?: string;
}

/**
 * Derives the rail panel view from presented episode data plus the live playback playlist. The
 * playlist is the single source of truth: it defines both the display order and the highlighted
 * episode, so player "next"/panel clicks move the highlight without any plugin-side sync events.
 */
export function resolvePresentedEpisodePanelView(
  panel: { episodes: GenericEpisodeItem[] },
  activePlayback: PlaylistSnapshot | null | undefined,
): PresentedEpisodePanelView {
  const playlist = activePlayback?.playlist;
  const playlistIds = playlist
    ? playlist.flatMap((item) => (item?.id != null && item.id !== "" ? [String(item.id)] : []))
    : [];
  const episodes = playlistIds.length > 0 ? orderItemsByIds(panel.episodes, playlistIds) : panel.episodes;
  const playlistIndex = activePlayback?.playlistIndex ?? -1;
  const activeItem = playlistIndex >= 0 ? playlist?.[playlistIndex] : undefined;
  const activeId = activeItem?.id;
  return {
    episodes,
    activeEpisodeId: activeId != null && activeId !== "" ? String(activeId) : undefined,
  };
}

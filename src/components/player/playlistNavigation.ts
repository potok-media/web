import type { PlaylistItem } from "../../context/playbackTypes";

/**
 * The next playlist index in a direction, skipping filler episodes when the toggle is on.
 * Manual selection in the playlist menu never goes through here — only prev/next buttons
 * and auto-advance. Returns undefined when nothing playable remains in that direction.
 */
export function nextPlayableIndex(
  playlist: PlaylistItem[],
  fromIndex: number,
  direction: 1 | -1,
  skipFillers: boolean,
): number | undefined {
  let index = fromIndex + direction;
  while (index >= 0 && index < playlist.length) {
    if (!(skipFillers && playlist[index].filler?.status === "filler")) return index;
    index += direction;
  }
  return undefined;
}

/** Short designation for tooltips: "S1E6 — Title" (or the bare title). */
export function playlistItemLabel(item: PlaylistItem): string {
  const designation =
    item.season !== undefined && item.episode !== undefined ? `S${item.season}E${item.episode}` : null;
  return designation ? `${designation} — ${item.title ?? ""}` : item.title ?? "";
}

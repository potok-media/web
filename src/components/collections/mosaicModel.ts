import type { UserFolderItem } from "../../utils/userData";

export const COVER_CELL_COUNT = 4;

export interface FolderCoverCell {
  key: string;
  /** Resolved image URL, or null when the item has no usable poster. */
  src: string | null;
}

export type PosterResolver = (posterSrc?: string | null) => string;

/**
 * Maps a folder's first items onto the 2×2 cover mosaic: at most `max` cells, in item order.
 * Items without a resolvable poster still occupy a cell (src = null) so the mosaic keeps its
 * grid shape and the UI renders a placeholder tile instead of collapsing the layout.
 */
export function buildCoverCells(
  items: Pick<UserFolderItem, "tmdbId" | "mediaType" | "posterSrc">[],
  resolvePoster: PosterResolver,
  max: number = COVER_CELL_COUNT,
): FolderCoverCell[] {
  return items.slice(0, max).map((item, index) => {
    const src = resolvePoster(item.posterSrc);
    return {
      key: `${item.mediaType}:${item.tmdbId || index}`,
      src: src || null,
    };
  });
}

/** True when none of the cells has a real poster — the card falls back to a single placeholder. */
export function isEmptyCover(cells: FolderCoverCell[]): boolean {
  return cells.every((cell) => !cell.src);
}

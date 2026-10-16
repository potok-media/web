import type { PlaylistItem } from "../context/playbackTypes";

interface Identifiable {
  id?: string | null;
}

export function moveItemById<T extends Identifiable>(
  items: readonly T[],
  sourceId: string,
  targetId: string,
): T[] {
  if (sourceId === targetId) return [...items];

  const sourceIndex = items.findIndex((item) => String(item.id) === sourceId);
  const targetIndex = items.findIndex((item) => String(item.id) === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return [...items];

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export function orderItemsByIds<T extends Identifiable>(
  items: readonly T[],
  orderedIds: readonly string[],
): T[] {
  const rank = new Map(orderedIds.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: item.id ? rank.get(String(item.id)) : undefined }))
    .sort((a, b) => {
      if (a.rank === undefined && b.rank === undefined) return a.index - b.index;
      if (a.rank === undefined) return 1;
      if (b.rank === undefined) return -1;
      return a.rank - b.rank;
    })
    .map(({ item }) => item);
}

export function reorderPlaylistKeepingCurrent(
  playlist: readonly PlaylistItem[],
  orderedIds: readonly string[],
  currentIndex: number,
): { playlist: PlaylistItem[]; playlistIndex: number } {
  const currentItem = playlist[currentIndex];
  const reordered = orderItemsByIds(playlist, orderedIds);
  const nextIndex = currentItem ? reordered.indexOf(currentItem) : -1;

  return {
    playlist: reordered,
    playlistIndex: nextIndex >= 0 ? nextIndex : Math.max(0, Math.min(currentIndex, reordered.length - 1)),
  };
}

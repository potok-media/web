export interface MediaLinkable {
  id: number | string;
  mediaType?: string | null;
  potokId?: string | null;
  entryId?: string | null;
}

/**
 * Canonical media link: the ARM potok identity when the card carries it (catalog/search cards
 * from our index), the tmdb-keyed legacy route otherwise (live-TMDB rows, external plugins).
 * The legacy route stays valid — it resolves and redirects to the canonical URL server-side
 * knowledge permitting.
 */
export function mediaCardLink(item: MediaLinkable): string {
  return item.potokId
    ? `/media/p/${item.potokId}${item.entryId ? `?g=${encodeURIComponent(item.entryId)}` : ""}`
    : `/media/${item.mediaType ?? "tv"}/${item.id}`;
}

/** Entries can share both a work and a provider id; lists and pagination keep each one. */
export function mediaCardKey(item: MediaLinkable): string {
  if (item.entryId) return `entry:${item.entryId}`;
  if (item.potokId) return `work:${item.potokId}`;
  return `${item.mediaType ?? "tv"}:${item.id}`;
}

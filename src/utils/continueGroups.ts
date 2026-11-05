import type { ContinueWatchingEpisodeItem } from "../network/ApiTypes";

/**
 * Pure grouping for the /library/continue page. The episodes endpoint already orders
 * rows the way the page must present them: title groups by most recent activity DESC,
 * episodes ascending within a title. Grouping therefore preserves first-seen order —
 * no re-sorting, so the page and the profile rail render the same rows in the same order.
 */

export interface ContinueEpisodeGroup {
  key: string;
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterSrc?: string;
  backdropSrc?: string;
  episodes: ContinueWatchingEpisodeItem[];
  /** Max lastWatchedAt across the group's rows (ms epoch) — the group's activity stamp. */
  lastActivityAt: number;
  /** Movie rows render as one wide backdrop card instead of an episode flow. */
  isFilm: boolean;
}

export function groupContinueEpisodes(items: ContinueWatchingEpisodeItem[]): ContinueEpisodeGroup[] {
  const byKey = new Map<string, ContinueEpisodeGroup>();
  for (const item of items) {
    const key = `${item.mediaType}:${item.id}`;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        id: item.id,
        mediaType: item.mediaType,
        title: item.title,
        posterSrc: item.posterSrc,
        backdropSrc: item.backdropSrc,
        episodes: [],
        lastActivityAt: 0,
        isFilm: item.mediaType === "movie",
      };
      byKey.set(key, group);
    }
    group.episodes.push(item);
    const watchedAt = item.lastWatchedAt ? Date.parse(item.lastWatchedAt) : NaN;
    if (Number.isFinite(watchedAt) && watchedAt > group.lastActivityAt) {
      group.lastActivityAt = watchedAt;
    }
  }
  return [...byKey.values()];
}

export type ContinueActivityKind = "today" | "yesterday" | "date";

export interface ContinueActivityDay {
  kind: ContinueActivityKind;
  /** The activity date in local time; null when the input could not be parsed. */
  date: Date | null;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendar-day bucketing for the muted group meta («сегодня» / «вчера» / a concrete date). */
export function continueActivityDay(
  lastWatchedAt: string | undefined,
  nowMs: number = Date.now(),
): ContinueActivityDay {
  const parsed = lastWatchedAt ? Date.parse(lastWatchedAt) : NaN;
  if (!Number.isFinite(parsed)) return { kind: "date", date: null };
  const dayDiff = Math.round((startOfDay(nowMs) - startOfDay(parsed)) / 86_400_000);
  if (dayDiff <= 0) return { kind: "today", date: new Date(parsed) };
  if (dayDiff === 1) return { kind: "yesterday", date: new Date(parsed) };
  return { kind: "date", date: new Date(parsed) };
}

/** Whole remaining minutes of a film row — the «осталось N мин» group-meta chip. */
export function remainingMinutes(progressSeconds: number, durationSeconds: number): number {
  if (!(durationSeconds > 0)) return 0;
  return Math.max(0, Math.round((durationSeconds - progressSeconds) / 60));
}

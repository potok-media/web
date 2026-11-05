import type { ProfileActivityItem } from "../network/ApiTypes";

/**
 * Pure grouping for the profile «История» activity feed. The endpoint pages by UTC calendar
 * days, but the feed renders in the viewer's local time, so grouping buckets by LOCAL
 * calendar day of occurredAt. Items arrive newest-first across appended pages; a local day
 * split across two UTC windows merges into a single group because grouping is recomputed
 * over the accumulated array.
 */

export interface ProfileActivityDayGroup {
  /** Stable merge key: the local calendar day (yyyy-MM-dd in local time). */
  dayKey: string;
  kind: "today" | "yesterday" | "date";
  /** First event of the day (local) — the representative date for a concrete-day header. */
  date: Date;
  items: ProfileActivityItem[];
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function localDayKey(ms: number): string {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Groups feed items by local calendar day, newest day first, items newest-first within a
 * day. Unparseable timestamps are skipped. `nowMs` is injectable for deterministic tests.
 */
export function groupProfileActivity(
  items: ProfileActivityItem[],
  nowMs: number = Date.now(),
): ProfileActivityDayGroup[] {
  const groups = new Map<string, ProfileActivityDayGroup>();
  for (const item of items) {
    const occurredMs = Date.parse(item.occurredAt);
    if (!Number.isFinite(occurredMs)) continue;
    const dayKey = localDayKey(occurredMs);
    let group = groups.get(dayKey);
    if (!group) {
      const dayDiff = Math.round((startOfLocalDay(nowMs) - startOfLocalDay(occurredMs)) / 86_400_000);
      group = {
        dayKey,
        kind: dayDiff <= 0 ? "today" : dayDiff === 1 ? "yesterday" : "date",
        date: new Date(occurredMs),
        items: [],
      };
      groups.set(dayKey, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}

/**
 * A collapsed binge: a run of >5 consecutive same-title episodes within one day group
 * renders as a single «Title» · Серии N–M · K серий row instead of a wall of near-identical
 * rows. Member events stay available (poster, tooltip) through `items`.
 */
export interface ProfileActivityBinge {
  /** Member events, newest first (the feed order they were collapsed from). */
  items: ProfileActivityItem[];
  title: ProfileActivityItem["title"];
  mediaType: "tv";
  seasonNumber: number;
  /** Inclusive episode range — min/max across the run, regardless of list direction. */
  fromEpisode: number;
  toEpisode: number;
  /** True only when every member event is completed — otherwise the row keeps the ▷ mark. */
  isCompleted: boolean;
  /** Newest member's timestamp — the row's clock label. */
  occurredAt: string;
}

export type ProfileActivityRow =
  | { kind: "event"; item: ProfileActivityItem }
  | { kind: "binge"; binge: ProfileActivityBinge };

/** Runs of this length or less stay as individual rows; longer runs collapse. */
const BINGE_MIN_RUN = 6;

function isBingeEligible(item: ProfileActivityItem): boolean {
  return (
    item.mediaType === "tv" &&
    item.seasonNumber != null &&
    item.episodeNumber != null
  );
}

/** Adjacent episodes of the same title/season — the feed is newest-first, so an in-order
 * binge appears with descending numbers; either direction extends the run. */
function continuesRun(prev: ProfileActivityItem, item: ProfileActivityItem): boolean {
  return (
    isBingeEligible(prev) &&
    isBingeEligible(item) &&
    item.title.tmdbId === prev.title.tmdbId &&
    item.seasonNumber === prev.seasonNumber &&
    Math.abs(item.episodeNumber! - prev.episodeNumber!) === 1
  );
}

/**
 * Flattens one day group's items (newest first) into render rows, collapsing binge runs.
 * Consecutive events of the same title (same tmdb/mediaType, same season, adjacent episode
 * numbers) form a run; a non-adjacent gap, a season change, or a title change splits it.
 * Runs of >5 episodes become one binge row; shorter runs (and all movies) stay individual.
 */
export function buildProfileActivityRows(items: ProfileActivityItem[]): ProfileActivityRow[] {
  const rows: ProfileActivityRow[] = [];
  let run: ProfileActivityItem[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (run.length >= BINGE_MIN_RUN && isBingeEligible(run[0])) {
      const episodes = run.map((item) => item.episodeNumber!);
      rows.push({
        kind: "binge",
        binge: {
          items: run,
          title: run[0].title,
          mediaType: "tv",
          seasonNumber: run[0].seasonNumber!,
          fromEpisode: Math.min(...episodes),
          toEpisode: Math.max(...episodes),
          isCompleted: run.every((item) => item.isCompleted),
          occurredAt: run[0].occurredAt,
        },
      });
    } else {
      for (const item of run) rows.push({ kind: "event", item });
    }
    run = [];
  };

  for (const item of items) {
    const prev = run[run.length - 1];
    if (prev != null && continuesRun(prev, item)) {
      run.push(item);
    } else {
      flush();
      run = [item];
    }
  }
  flush();
  return rows;
}

/** HH:MM in local time — the row's clock label. */
export function formatActivityTime(occurredAt: string): string {
  const d = new Date(occurredAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

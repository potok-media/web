import type { ProfileSummary } from "../network/ApiTypes";

export interface ChartBar {
  /** ISO date of the day. */
  date: string;
  minutes: number;
  /** Bar height as a fraction of 0..1 relative to the max day (0 when the chart is empty). */
  heightRatio: number;
  /** The single busiest day renders in the app accent color. */
  isMax: boolean;
}

export const PROFILE_CHART_DAYS = 30;

/** Whole hours + remainder minutes, floored — what the stats chips display. */
export function splitHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/**
 * Maps the summary's fixed 30-entry daily series to chart bars: zero-filled days render as a
 * baseline sliver, the max day is flagged for the accent color. Tolerates short/long arrays and
 * unparseable minutes so a half-deployed gateway never crashes the panel.
 */
export function mapDailyToChartBars(
  daily: ProfileSummary["daily"],
  days: number = PROFILE_CHART_DAYS,
): ChartBar[] {
  const source = Array.isArray(daily) ? daily.slice(-days) : [];
  const minutesList = source.map((d) =>
    Math.max(0, Math.floor(Number(d?.minutes) || 0)),
  );
  const max = minutesList.reduce((acc, m) => Math.max(acc, m), 0);
  const maxIndex = max > 0 ? minutesList.indexOf(max) : -1;
  return source.map((d, index) => ({
    date: typeof d?.date === "string" ? d.date : "",
    minutes: minutesList[index],
    heightRatio: max > 0 ? minutesList[index] / max : 0,
    isMax: index === maxIndex,
  }));
}

/** Total across the daily series — the chart footer "N мин за 30 дней" line. */
export function sumDailyMinutes(daily: ProfileSummary["daily"]): number {
  if (!Array.isArray(daily)) return 0;
  return daily.reduce((acc, d) => acc + Math.max(0, Math.floor(Number(d?.minutes) || 0)), 0);
}

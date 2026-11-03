import { describe, expect, it } from "vitest";
import {
  mapDailyToChartBars,
  PROFILE_CHART_DAYS,
  splitHoursMinutes,
  sumDailyMinutes,
} from "./profileStats";
import type { ProfileSummary } from "../network/ApiTypes";

function daily(minutes: number[], days: number = PROFILE_CHART_DAYS): ProfileSummary["daily"] {
  const start = Date.parse("2026-10-05T00:00:00Z");
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * 86400000).toISOString(),
    minutes: minutes[i] ?? 0,
  }));
}

describe("splitHoursMinutes", () => {
  it("splits total minutes into whole hours and the remainder", () => {
    expect(splitHoursMinutes(767)).toEqual({ hours: 12, minutes: 47 });
    expect(splitHoursMinutes(45)).toEqual({ hours: 0, minutes: 45 });
  });

  it("clamps negative and garbage input", () => {
    expect(splitHoursMinutes(-5)).toEqual({ hours: 0, minutes: 0 });
    expect(splitHoursMinutes(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("mapDailyToChartBars", () => {
  it("maps a zero-filled series with the max day flagged", () => {
    const minutes = new Array(30).fill(0);
    minutes[10] = 33;
    minutes[25] = 60;
    const bars = mapDailyToChartBars(daily(minutes));
    expect(bars).toHaveLength(30);
    expect(bars.filter((b) => b.isMax)).toHaveLength(1);
    expect(bars[25].isMax).toBe(true);
    expect(bars[25].heightRatio).toBe(1);
    expect(bars[10].heightRatio).toBeCloseTo(33 / 60);
    expect(bars[0].heightRatio).toBe(0);
    expect(bars[0].minutes).toBe(0);
  });

  it("all-zero series produces no max bar", () => {
    const bars = mapDailyToChartBars(daily(new Array(30).fill(0)));
    expect(bars.every((b) => !b.isMax && b.heightRatio === 0)).toBe(true);
  });

  it("tolerates short, long, and malformed input", () => {
    expect(mapDailyToChartBars(daily([5], 1))).toHaveLength(1);
    expect(mapDailyToChartBars(daily(new Array(40).fill(1), 40))).toHaveLength(30);
    const malformed = [{ date: "x", minutes: "oops" }, null] as unknown as ProfileSummary["daily"];
    const bars = mapDailyToChartBars(malformed);
    expect(bars).toHaveLength(2);
    expect(bars[0].minutes).toBe(0);
    expect(bars[1].minutes).toBe(0);
    expect(mapDailyToChartBars(undefined as unknown as ProfileSummary["daily"])).toEqual([]);
  });
});

describe("sumDailyMinutes", () => {
  it("sums the daily series and tolerates garbage", () => {
    expect(sumDailyMinutes(daily([10, 20, 30], 3))).toBe(60);
    expect(sumDailyMinutes(undefined as unknown as ProfileSummary["daily"])).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  formatOneSeasonLabel,
  formatOverrideBadge,
  overrideSummaryFromMaps,
} from "./streamOverrideBadge";
import type { StreamOverrideSummary } from "./streamOverrideBadge";

const t = (key: string, options?: Record<string, unknown>) => {
  const count = options?.count ?? 0;
  if (key === "row.overrideSeasons") return Number(count) === 1 ? "1 season" : `${count} seasons`;
  if (key === "row.overrideFiles") return Number(count) === 1 ? "1 file" : `${count} files`;
  return key;
};

describe("formatOverrideBadge", () => {
  it("returns nothing when override is missing or empty", () => {
    expect(formatOverrideBadge(undefined, t)).toBeUndefined();
    expect(formatOverrideBadge({ seasonCount: 0, fileCount: 0 }, t)).toBeUndefined();
  });

  it("formats a remapped season as S1→S2", () => {
    const override: StreamOverrideSummary = {
      seasonCount: 1,
      fileCount: 0,
      primarySource: "1",
      primarySeason: 2,
      primaryOffset: 0,
    };
    expect(formatOneSeasonLabel(override)).toBe("S1→S2");
    expect(formatOverrideBadge(override, t)).toEqual({ label: "S1→S2" });
  });

  it("formats same-season offset with an explicit sign and a minus character", () => {
    expect(
      formatOverrideBadge(
        { seasonCount: 1, fileCount: 0, primarySource: "2", primarySeason: 2, primaryOffset: 3 },
        t,
      ),
    ).toEqual({ label: "S2 +3" });
    expect(
      formatOverrideBadge(
        { seasonCount: 1, fileCount: 0, primarySource: "2", primarySeason: 2, primaryOffset: -1 },
        t,
      ),
    ).toEqual({ label: "S2 −1" });
  });

  it("treats sentinel source _ as S{target} {offset} without S_", () => {
    const override: StreamOverrideSummary = {
      seasonCount: 1,
      fileCount: 0,
      primarySource: "_",
      primarySeason: 2,
      primaryOffset: 3,
    };
    expect(formatOneSeasonLabel(override)).toBe("S2 +3");
    expect(formatOverrideBadge(override, t)?.label).not.toContain("S_");
  });

  it("uses i18n counts for several seasons, files-only, and both", () => {
    expect(formatOverrideBadge({ seasonCount: 3, fileCount: 0 }, t)).toEqual({ label: "3 seasons" });
    expect(formatOverrideBadge({ seasonCount: 0, fileCount: 2 }, t)).toEqual({ label: "2 files" });
    expect(formatOverrideBadge({ seasonCount: 3, fileCount: 2 }, t)).toEqual({
      label: "3 seasons · 2 files",
    });
    expect(
      formatOverrideBadge(
        { seasonCount: 1, fileCount: 2, primarySource: "1", primarySeason: 2, primaryOffset: 0 },
        t,
      ),
    ).toEqual({ label: "S1→S2 · 2 files" });
  });
});

describe("overrideSummaryFromMaps", () => {
  it("returns undefined when both maps are empty", () => {
    expect(overrideSummaryFromMaps({}, {})).toBeUndefined();
    expect(overrideSummaryFromMaps(undefined, undefined)).toBeUndefined();
  });

  it("snapshots a single season including sentinel source", () => {
    expect(overrideSummaryFromMaps({ _: { season: 2, offset: 3 } }, undefined)).toEqual({
      seasonCount: 1,
      fileCount: 0,
      primarySource: "_",
      primarySeason: 2,
      primaryOffset: 3,
    });
  });

  it("counts several seasons and files without picking a primary", () => {
    expect(
      overrideSummaryFromMaps(
        { "1": { season: 1, offset: 0 }, "2": { season: 2, offset: 1 } },
        { a: {}, b: {} },
      ),
    ).toEqual({ seasonCount: 2, fileCount: 2 });
  });
});

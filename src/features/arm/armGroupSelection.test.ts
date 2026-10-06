import { describe, expect, it } from "vitest";
import type { ArmEpisodeLayoutResponse, ArmLayoutGroup } from "../../network/ArmTypes";
import {
  pickMainGroup,
  resolveCanonicalTarget,
  resolveLegacyRedirect,
} from "./armGroupSelection";

let nextId = 0;
function group(overrides: Partial<ArmLayoutGroup>): ArmLayoutGroup {
  nextId += 1;
  return {
    id: overrides.id ?? `g${nextId}`,
    kind: "season",
    number: 1,
    episodes: [{ id: `e${nextId}`, number: 1 }],
    ...overrides,
  } as ArmLayoutGroup;
}

function layout(groups: ArmLayoutGroup[]): ArmEpisodeLayoutResponse {
  return { work: { id: "w1" }, graphVersion: "v1", groups } as ArmEpisodeLayoutResponse;
}

describe("pickMainGroup", () => {
  it("puts seasons first and the lowest season number wins", () => {
    const main = pickMainGroup([
      group({ id: "ova", kind: "ova", number: 1 }),
      group({ id: "s2", kind: "season", number: 2 }),
      group({ id: "s1", kind: "season", number: 1 }),
      group({ id: "movie", kind: "movie", number: 1 }),
    ]);
    expect(main?.id).toBe("s1");
  });
});

describe("resolveCanonicalTarget", () => {
  it("uses the deep-linked bridged entry", () => {
    const target = resolveCanonicalTarget(layout([
      group({ id: "bleach", tmdbShow: 30984, tmdbSeason: 1 }),
      group({ id: "btw", kind: "sides", number: 1, tmdbShow: 110911, tmdbSeason: 1 }),
    ]), "btw");
    expect(target).toEqual({ entryId: "btw", mediaType: "tv", tmdbId: 110911 });
  });

  it("falls back to the main bridged group without a deep link", () => {
    const target = resolveCanonicalTarget(layout([
      group({ id: "movie", kind: "movie", number: 1, tmdbShow: 422807, tmdbSeason: null }),
      group({ id: "s1", tmdbShow: 30984, tmdbSeason: 1 }),
    ]), null);
    expect(target).toEqual({ entryId: "s1", mediaType: "tv", tmdbId: 30984 });
  });

  it("maps a group without a season coordinate to a movie page", () => {
    const target = resolveCanonicalTarget(layout([
      group({ id: "m", kind: "movie", number: 1, tmdbShow: 422807, tmdbSeason: null }),
    ]), null);
    expect(target).toEqual({ entryId: "m", mediaType: "movie", tmdbId: 422807 });
  });

  it("ignores unbridged and empty groups, returns null when nothing is addressable", () => {
    expect(resolveCanonicalTarget(layout([
      group({ id: "unbridged", tmdbShow: null, tmdbSeason: null }),
      group({ id: "empty", tmdbShow: 1, tmdbSeason: 1, episodes: [] }),
    ]), null)).toBeNull();
    expect(resolveCanonicalTarget(layout([
      group({ id: "unbridged", tmdbShow: null, tmdbSeason: null }),
    ]), "unbridged")).toBeNull();
  });
});

describe("resolveLegacyRedirect", () => {
  // Prod case: /media/tv/110911 (Burn the Witch) resolves to the Bleach franchise work —
  // the redirect must land on the BtW entry, not on the franchise's main Bleach-2004 season.
  it("lands on the entry whose coordinate is the requested tmdb id", () => {
    const target = resolveLegacyRedirect(layout([
      group({ id: "bleach-s1", number: 1, tmdbShow: 30984, tmdbSeason: 1 }),
      group({ id: "bleach-s2", number: 2, tmdbShow: 30984, tmdbSeason: 2 }),
      group({ id: "btw", kind: "sides", number: 1, tmdbShow: 110911, tmdbSeason: 1 }),
    ]), 110911);
    expect(target).toEqual({ entryId: "btw", mediaType: "tv", tmdbId: 110911 });
  });

  it("a franchise show with several seasons targets its own main season", () => {
    const target = resolveLegacyRedirect(layout([
      group({ id: "bleach-s1", number: 1, tmdbShow: 30984, tmdbSeason: 1 }),
      group({ id: "bleach-s2", number: 2, tmdbShow: 30984, tmdbSeason: 2 }),
      group({ id: "btw", kind: "sides", number: 1, tmdbShow: 110911, tmdbSeason: 1 }),
    ]), 30984);
    expect(target?.entryId).toBe("bleach-s1");
  });

  it("a movie coordinate targets a movie page", () => {
    const target = resolveLegacyRedirect(layout([
      group({ id: "m", kind: "movie", number: 1, tmdbShow: 422807, tmdbSeason: null }),
    ]), 422807);
    expect(target).toEqual({ entryId: "m", mediaType: "movie", tmdbId: 422807 });
  });

  it("returns null when the layout has nothing bridged", () => {
    expect(resolveLegacyRedirect(layout([
      group({ id: "bare", tmdbShow: null, tmdbSeason: null }),
    ]), 110911)).toBeNull();
  });
});

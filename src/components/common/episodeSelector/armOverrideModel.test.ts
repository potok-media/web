import { describe, expect, it } from "vitest";
import type { ArmEpisodeLayoutResponse, ArmLayoutEpisode, ArmLayoutGroup } from "../../../network/ArmTypes";
import { buildEpisodeBindingOverride, sectionBindingAnchorIds, toArmOverrideGroups } from "./armOverrideModel";
import { buildEpisodeSourceSections } from "./utils";
import type { GenericEpisodeItem } from "./types";

const target = { workId: "work", entryId: "ova-a", episodeId: "ova-1" };
function episode(id: string, overrides: Partial<ArmLayoutEpisode> = {}): ArmLayoutEpisode {
  return { id, number: 1, title: null, ...overrides };
}
function group(id: string, episodes: ArmLayoutEpisode[], overrides: Partial<ArmLayoutGroup> = {}): ArmLayoutGroup {
  return { id, kind: "ova", number: 1, title: null, episodes, ...overrides };
}
function layout(groups: ArmLayoutGroup[], overrides: Partial<ArmEpisodeLayoutResponse> = {}): ArmEpisodeLayoutResponse {
  return {
    work: { id: "work", title: null, titles: {} },
    graphVersion: "graph", groups, ...overrides,
  };
}
function file(id: string, entryId: string, overrides: Partial<GenericEpisodeItem> = {}): GenericEpisodeItem {
  return { id, entryId, audios: [], ...overrides };
}
const sections = buildEpisodeSourceSections([
  file("main-1", "season"), file("main-2", "season"), file("main-3", "season"),
  file("ova-file", "ova"),
]);

describe("canonical override targets", () => {
  it("labels a canonical group by ARM display number instead of its TMDB projection", () => {
    const [section] = buildEpisodeSourceSections([
      file("main", "season", { season: 7, episode: 12, groupKind: "season", groupDisplayNumber: 2 }),
    ]);
    expect(section.displayedSeason).toBe(2);
    expect(section.episodes[0].season).toBe(7);
    expect(buildEpisodeSourceSections([file("main", "season", { season: 7 })])[0].displayedSeason).toBeUndefined();
  });
  it("preserves distinct specials/movie/OVA groups in the backend's kind order", () => {
    const groups = toArmOverrideGroups(layout([
      group("ova-a", [episode("ova-1")], { kind: "ova" }),
      group("specials-a", [episode("s1")], { kind: "specials" }),
      group("specials-b", [episode("s2")], { kind: "specials" }),
      group("movie", [episode("movie-1")], { kind: "movie" }),
    ]));
    expect(groups.map((value) => value.id)).toEqual(["ova-a", "specials-a", "specials-b", "movie"]);
    expect(groups[0].episodes[0].target).toEqual(target);
    expect(new Set(groups.flatMap((value) => value.episodes.map((item) => item.target.episodeId))).size).toBe(4);
  });

  it("never turns a missing work identity into manual targets", () => {
    expect(toArmOverrideGroups(null)).toEqual([]);
    expect(toArmOverrideGroups(undefined)).toEqual([]);
  });

  it("keeps fractional numbers and the filler verdict on the override episode", () => {
    const filler = { status: "filler" as const, confidence: 1, disputed: false };
    const groups = toArmOverrideGroups(layout([group("ova-a", [
      episode("ova-1", { number: 1.5, filler }),
      episode("ova-2", { number: 2, title: "Second" }),
    ])]));
    expect(groups[0].episodes[0]).toMatchObject({ ordinal: "1.5", filler });
    expect(groups[0].episodes[1]).toMatchObject({ ordinal: "2", title: "Second" });
  });
});

describe("canonical override scope", () => {
  it("anchors a whole source section to its first actual file only", () => {
    expect(buildEpisodeBindingOverride({ target, sections, editingFile: null, editingSectionKey: "arm:season" }))
      .toEqual({ fileId: "main-1", mode: "anchor", armTarget: target, scopeFileIds: ["main-1", "main-2", "main-3"] });
  });

  it("per-file anchor includes following files in the current section and excludes other groups", () => {
    expect(buildEpisodeBindingOverride({ target, sections, editingFile: { id: "main-2", mode: "anchor" } }))
      .toEqual({ fileId: "main-2", mode: "anchor", armTarget: target, scopeFileIds: ["main-2", "main-3"] });
  });

  it("pin does not carry a run scope", () => {
    expect(buildEpisodeBindingOverride({ target, sections, editingFile: { id: "main-2", mode: "pin" } }))
      .toEqual({ fileId: "main-2", mode: "pin", armTarget: target });
  });

  it("does not apply a stale selection after the selected source file disappears", () => {
    expect(buildEpisodeBindingOverride({ target, sections, editingFile: { id: "removed", mode: "anchor" } })).toBeNull();
    expect(buildEpisodeBindingOverride({ target, sections, editingFile: null, editingSectionKey: "removed" })).toBeNull();
  });

  it("finds a scoped anchor for reset after its files move to a different display group", () => {
    expect(sectionBindingAnchorIds(sections[1], {
      "main-1": { mode: "anchor", armTarget: target, scopeFileIds: ["main-1", "ova-file"] },
      "ova-file": { mode: "pin", armTarget: target },
      "legacy": { mode: "anchor", season: 1, episode: 1 },
    })).toEqual(["main-1"]);
  });
});

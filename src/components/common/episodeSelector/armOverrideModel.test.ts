import { describe, expect, it } from "vitest";
import type { ArmEpisodeGroup, ArmEpisodeLayoutResponse, ArmEpisodePlacement } from "../../../network/ArmTypes";
import { buildEpisodeBindingOverride, sectionBindingAnchorIds, toArmOverrideGroups } from "./armOverrideModel";
import { buildEpisodeSourceSections } from "./utils";
import type { GenericEpisodeItem } from "./types";

const target = { workId: "work", orderingId: "order", groupId: "ova-a", episodeId: "ova-1" };
function placement(id: string, groupId: string, overrides: Partial<ArmEpisodePlacement> = {}): ArmEpisodePlacement {
  return { id, groupId, ordinal: "1", sortPosition: 1, displayTitle: null, providerReferences: [], ...overrides };
}
function group(id: string, episodes: ArmEpisodePlacement[], overrides: Partial<ArmEpisodeGroup> = {}): ArmEpisodeGroup {
  return { id, kind: "ova", sortPosition: 1, displayTitle: null, episodes, ...overrides };
}
function layout(groups: ArmEpisodeGroup[], overrides: Partial<ArmEpisodeLayoutResponse> = {}): ArmEpisodeLayoutResponse {
  return {
    graphVersion: "graph", resolutionState: "resolved", coverageState: "complete", warnings: [],
    workId: "work", ordering: { id: "order", kind: "default", isDefault: true }, groups, ...overrides,
  };
}
function file(id: string, groupId: string, overrides: Partial<GenericEpisodeItem> = {}): GenericEpisodeItem {
  return { id, groupId, audios: [], ...overrides };
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
  it("preserves distinct specials/movie/OVA groups with the same ordinal", () => {
    const groups = toArmOverrideGroups(layout([
      group("specials-a", [placement("s1", "specials-a")], { kind: "specials", sortPosition: 2 }),
      group("specials-b", [placement("s2", "specials-b")], { kind: "specials", sortPosition: 3 }),
      group("ova-a", [placement("ova-1", "ova-a")], { kind: "ova", sortPosition: 1 }),
      group("movie", [placement("movie-1", "movie")], { kind: "movie", sortPosition: 4 }),
    ]));
    expect(groups.map((value) => value.id)).toEqual(["ova-a", "specials-a", "specials-b", "movie"]);
    expect(groups[0].episodes[0].target).toEqual(target);
    expect(new Set(groups.flatMap((value) => value.episodes.map((episode) => episode.target.episodeId))).size).toBe(4);
  });

  it("never turns provisional or ambiguous numbers into manual identities", () => {
    const groups = [group("ova-a", [placement("ova-1", "ova-a")])];
    expect(toArmOverrideGroups(layout(groups, { ordering: null }))).toEqual([]);
    expect(toArmOverrideGroups(layout(groups, { resolutionState: "ambiguous" }))).toEqual([]);
    expect(toArmOverrideGroups(layout(groups, { resolutionState: "unresolved" }))).toEqual([]);
    expect(toArmOverrideGroups(layout(groups, { resolutionState: "partial" }))).toHaveLength(1);
  });

  it("rejects a misplaced episode instead of combining its ID with the wrong group", () => {
    expect(toArmOverrideGroups(layout([group("ova-a", [placement("wrong", "ova-b")])]))).toEqual([]);
  });

  it("preserves nonnumeric ordinals and filler evidence without fake episode one", () => {
    const annotation = { episodeId: "ova-1", relation: "filler" as const, recommendation: "skip" as const,
      resolutionState: "resolved" as const, confidence: 1, evidence: [] };
    const groups = toArmOverrideGroups(layout([group("ova-a", [
      placement("blank", "ova-a", { ordinal: "", sortPosition: 2 }),
      placement("ova-1", "ova-a", { ordinal: "OVA 1", annotation }),
    ])]));
    expect(groups[0].episodes[0]).toMatchObject({ ordinal: "OVA 1", annotation });
    expect(groups[0].episodes[1].ordinal).toBe("");
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

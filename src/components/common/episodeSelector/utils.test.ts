import { describe, expect, it } from "vitest";
import { buildEpisodeSourceSections, hasEpisodeParsingWarning, resolvedSeasonNumbers } from "./utils";
import type { GenericEpisodeItem } from "./types";

const episode = (overrides: Partial<GenericEpisodeItem>): GenericEpisodeItem => ({
  id: "file-1",
  title: "Example.mkv",
  audios: [],
  ...overrides,
});

describe("episode selector ARM fallbacks", () => {
  it("keeps unresolved files in their own bucket without inventing season one", () => {
    const sections = buildEpisodeSourceSections([
      episode({ id: "resolved", season: 2, episode: 1, rawEpisode: 13 }),
      episode({ id: "unresolved", rawEpisode: 14 }),
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ displayedSeason: 2, unresolved: false });
    expect(sections[1]).toMatchObject({ displayedSeason: undefined, unresolved: true });
    expect(sections[1].episodes[0].season).toBeUndefined();
  });

  it("only returns actual numeric seasons for parser diagnostics", () => {
    expect(resolvedSeasonNumbers([
      episode({ season: 0, episode: 1 }),
      episode({ season: 7, episode: 1 }),
      episode({ rawEpisode: 2 }),
    ])).toEqual([0, 7]);
  });

  it("does not reject a valid Potok season merely because TMDB has fewer seasons", () => {
    expect(hasEpisodeParsingWarning({
      episodes: [episode({ season: 7, episode: 1 })],
      mediaType: "tv",
      parserVerdict: false,
    })).toBe(false);
  });

  it("keeps distinct ARM groups separate even when raw season evidence is identical", () => {
    const sections = buildEpisodeSourceSections([
      episode({ id: "cour-1", groupId: "group-a", rawSeason: 1, season: 1, episode: 1 }),
      episode({ id: "cour-2", groupId: "group-b", rawSeason: 1, season: 1, episode: 13 }),
    ]);

    expect(sections.map((section) => section.key)).toEqual(["arm:group-a", "arm:group-b"]);
  });

  it("does not label a canonical ARM group unresolved when it has no numeric projection", () => {
    const section = buildEpisodeSourceSections([
      episode({ groupId: "special-group", resolutionState: "resolved" }),
    ])[0];

    expect(section).toMatchObject({ key: "arm:special-group", unresolved: false });
    expect(section.displayedSeason).toBeUndefined();
  });
});

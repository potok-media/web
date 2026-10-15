import { describe, expect, it } from "vitest";
import type { ArmEntryDetail } from "../../network/ArmTypes";
import { reconstructLayout } from "./layoutReconstruction";

describe("reconstructLayout", () => {
  it("merges flat entries and episodes into the legacy layout shape", () => {
    const entries = [
      {
        entryId: "e1",
        kind: "season",
        number: 1,
        sortPosition: 0,
        structureSource: "anilist",
        externalIds: [],
        localizedTitles: [{ language: "en", value: "Season 1", source: "anilist" }],
        tmdb: { showId: 65930, season: 1 },
        displayMetadata: null,
      },
      {
        entryId: "e2",
        kind: "specials",
        number: 1,
        sortPosition: 1,
        structureSource: "anilist",
        externalIds: [],
        localizedTitles: [],
        tmdb: null,
        displayMetadata: null,
      },
    ];

    const episodes = [
      {
        episodeId: "ep1",
        groupId: "e1",
        number: 1,
        tmdb: { showId: 65930, season: 1, episode: 1 },
        localizedTitles: [{ locale: "en", value: "Episode 1" }],
        overview: null,
        stillPath: null,
        airDate: "2024-01-01",
        filler: null,
      },
      {
        episodeId: "ep2",
        groupId: "e1",
        number: 2,
        tmdb: { showId: 65930, season: 1, episode: 2 },
        localizedTitles: [],
        overview: null,
        stillPath: null,
        airDate: null,
        filler: null,
      },
      {
        episodeId: "ep3",
        groupId: "e2",
        number: 1,
        tmdb: null,
        localizedTitles: [],
        overview: null,
        stillPath: null,
        airDate: null,
        filler: null,
      },
    ];

    const layout = reconstructLayout(entries, episodes, "work-1", "en");

    expect(layout.work.id).toBe("work-1");
    expect(layout.groups.length).toBe(2);

    // First group: season 1
    expect(layout.groups[0].id).toBe("e1");
    expect(layout.groups[0].kind).toBe("season");
    expect(layout.groups[0].number).toBe(1);
    expect(layout.groups[0].episodes.length).toBe(2);
    expect(layout.groups[0].episodes[0].id).toBe("ep1");
    expect(layout.groups[0].episodes[1].id).toBe("ep2");
    expect(layout.groups[0].tmdbShow).toBe(65930);
    expect(layout.groups[0].tmdbSeason).toBe(1);

    // Second group: specials
    expect(layout.groups[1].id).toBe("e2");
    expect(layout.groups[1].kind).toBe("specials");
    expect(layout.groups[1].episodes.length).toBe(1);
    expect(layout.groups[1].episodes[0].id).toBe("ep3");
  });

  it("selects an entry title matching the active locale instead of the first title", () => {
    const entries = [
      {
        entryId: "e1",
        kind: "season",
        number: 1,
        sortPosition: 0,
        structureSource: "anilist",
        externalIds: [],
        localizedTitles: [
          { language: "ja-Latn", value: "Kimetsu no Yaiba: Yuukaku-hen", source: "anilist" },
          { language: "en", value: "Demon Slayer: Entertainment District Arc", source: "anilist" },
          { language: "ru", value: "Клинок, рассекающий демонов: Квартал красных фонарей", source: "shikimori" },
        ],
        tmdb: null,
        displayMetadata: null,
      },
    ] satisfies ArmEntryDetail[];

    const layout = reconstructLayout(entries, [], "work-1", "ru-RU");

    expect(layout.groups[0].title).toBe("Клинок, рассекающий демонов: Квартал красных фонарей");
  });

  it("sorts groups by kind then number", () => {
    const entries = [
      {
        entryId: "s1", kind: "season", number: 1, sortPosition: 1,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
      {
        entryId: "sp1", kind: "specials", number: 1, sortPosition: 3,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
      {
        entryId: "s2", kind: "season", number: 2, sortPosition: 2,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
      {
        entryId: "m1", kind: "movie", number: 1, sortPosition: 4,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
    ];

    const layout = reconstructLayout(entries, [], "work-1", "en");

    // Expected order: season 1, season 2 (kind rank 0), movie (rank 2), specials (rank 4)
    expect(layout.groups.map((g) => `${g.kind}:${g.number}`)).toEqual([
      "season:1",
      "season:2",
      "movie:1",
      "specials:1",
    ]);
  });

  it("handles empty inputs", () => {
    const layout = reconstructLayout([], [], "work-1", "en");
    expect(layout.work.id).toBe("work-1");
    expect(layout.groups).toEqual([]);
  });

  it("handles episodes with no matching entry (orphan episodes stay in empty group)", () => {
    const entries = [
      {
        entryId: "e1", kind: "season", number: 1, sortPosition: 0,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
    ] satisfies ArmEntryDetail[];

    const episodes = [
      {
        episodeId: "ep1", groupId: "e1", number: 1,
        tmdb: null, localizedTitles: [], overview: null,
        stillPath: null, airDate: null, filler: null,
      },
      {
        episodeId: "ep-orphan", groupId: "e999", number: 1,
        tmdb: null, localizedTitles: [], overview: null,
        stillPath: null, airDate: null, filler: null,
      },
    ];

    const layout = reconstructLayout(entries, episodes, "work-1", "en");
    expect(layout.groups[0].episodes.length).toBe(1); // only ep1 for e1
  });

  it("maps TMDB coordinates correctly", () => {
    const entries = [
      {
        entryId: "e1", kind: "season", number: 1, sortPosition: 0,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: { showId: 12345, season: 2 },
        displayMetadata: null,
      },
    ];

    const episodes = [
      {
        episodeId: "ep1", groupId: "e1", number: 5,
        tmdb: { showId: 12345, season: 2, episode: 5 },
        localizedTitles: [], overview: null,
        stillPath: null, airDate: null, filler: null,
      },
    ];

    const layout = reconstructLayout(entries, episodes, "w1", "en");
    expect(layout.groups[0].episodes[0].tmdb?.show).toBe(12345);
    expect(layout.groups[0].episodes[0].tmdb?.season).toBe(2);
    expect(layout.groups[0].episodes[0].tmdb?.episode).toBe(5);
  });

  it("passes empty localizedTitles through", () => {
    const entries = [
      {
        entryId: "e1", kind: "season", number: 1, sortPosition: 0,
        structureSource: "anilist", externalIds: [], localizedTitles: [],
        tmdb: null, displayMetadata: null,
      },
    ];

    const layout = reconstructLayout(entries, [], "w1", "en");
    expect(layout.groups[0].title).toBe(null);
  });
});

import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import { toEpisodeGroupPresentations } from "./episodeLayoutModel";
import { finalizeGroupTitle, orderGroupsByKind } from "../../components/seasonGroupLabels";
import enTranslations from "../../i18n/locales/en.json";
import ruTranslations from "../../i18n/locales/ru.json";

/** Minimal `t` over the bundled locale JSON — enough for the plain-string `media.seasons` keys. */
function translatorFor(translations: typeof enTranslations): TFunction<"media"> {
  return ((key: string) => {
    const value = key
      .split(".")
      .reduce<unknown>(
        (node, part) => (node as Record<string, unknown> | undefined)?.[part],
        translations.media,
      );
    return typeof value === "string" ? value : key;
  }) as TFunction<"media">;
}

const tEn = translatorFor(enTranslations);
const tRu = translatorFor(ruTranslations);

describe("ARM episode layout presentation", () => {
  it("keeps Potok entry and episode identities while exposing TMDB only as a projection", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-1", title: "Example", titles: {} },
      graphVersion: "graph-7",
      groups: [
        {
          id: "cour-2",
          kind: "season",
          number: 2,
          title: "Сезон 1 · Часть 2",
          episodes: [
            {
              id: "episode-13",
              number: 13,
              title: "Продолжение",
              overview: "Описание",
              stillPath: "/still.jpg",
              airDate: "2025-01-01",
              filler: { status: "mixed", confidence: 0.72, disputed: true },
              tmdb: { show: 100, season: 1, episode: 13 },
            },
          ],
        },
      ],
    };

    expect(toEpisodeGroupPresentations(layout)).toEqual([
      {
        id: "cour-2",
        kind: "season",
        title: "Сезон 1 · Часть 2",
        displayNumber: 2,
        episodes: [
          {
            id: "episode-13",
            name: "Продолжение",
            overview: "Описание",
            episodeNumber: 13,
            seasonNumber: 2,
            airDate: "2025-01-01",
            stillPath: "/still.jpg",
            armEpisodeId: "episode-13",
            armEntryId: "cour-2",
            armNumber: 13,
            tmdbSeasonNumber: 1,
            tmdbEpisodeNumber: 13,
            filler: { status: "mixed", confidence: 0.72, disputed: true },
          },
        ],
      },
    ]);
  });

  it("does not invent a TMDB coordinate for an ARM-only episode", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-2", title: null, titles: {} },
      graphVersion: "graph-8",
      groups: [
        {
          id: "ova",
          kind: "ova",
          number: 1,
          title: "OVA",
          episodes: [
            {
              id: "episode-ova",
              number: 1,
              title: "Training of the Dead",
            },
          ],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout);
    expect(group.id).toBe("collapsed-ova");
    expect(group.episodes[0]).toMatchObject({
      id: "episode-ova",
      name: "Training of the Dead",
      armEpisodeId: "episode-ova",
      armEntryId: "ova",
      armNumber: 1,
      filler: null,
    });
    expect(group.episodes[0].tmdbSeasonNumber).toBeUndefined();
    expect(group.episodes[0].tmdbEpisodeNumber).toBeUndefined();
  });

  it("defers untitled season groups to a localized fallback and keeps episodes nameless", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-3", title: null, titles: {} },
      graphVersion: "graph-9",
      groups: [
        {
          id: "specials",
          kind: "specials",
          number: 0,
          title: "Extras",
          episodes: [],
        },
        {
          id: "season-1",
          kind: "season",
          number: 1,
          title: "  ",
          episodes: [
            {
              id: "episode-1",
              number: 1,
              title: null,
            },
          ],
        },
      ],
    };

    const groups = toEpisodeGroupPresentations(layout);

    // Backend order is preserved as-is (specials entry has no displayable episodes and collapses away).
    const season = groups.find((group) => group.id === "season-1")!;
    expect(season.title).toBe("");
    expect(season.titleFallback).toEqual({ kind: "season", number: 1 });
    // A bare number must not be echoed as the name — the card renders the number alone.
    expect(season.episodes[0].name).toBe("");
  });

  it("collapses untitled specials/movie groups into one kind-labeled entry each", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-6", title: null, titles: {} },
      graphVersion: "graph-12",
      groups: [
        {
          id: "specials-0",
          kind: "specials",
          number: 0,
          title: null,
          episodes: [
            { id: "specials-0-ep", number: 1, title: "Special One" },
          ],
        },
        {
          id: "movie-1",
          kind: "movie",
          number: 1,
          title: null,
          episodes: [
            { id: "movie-1-ep", number: 1, title: "Movie One" },
          ],
        },
        {
          id: "cour-x",
          kind: "cour",
          number: 3,
          title: null,
          episodes: [],
        },
      ],
    };

    const [specials, movie, cour] = toEpisodeGroupPresentations(layout);

    // A lone group of a collapsed kind still gets the synthetic id and the number-less kind
    // fallback, so the component renders the generic localized label ("Спешлы" / "Фильмы").
    expect(specials).toMatchObject({
      id: "collapsed-specials",
      kind: "specials",
      title: "",
      titleFallback: { kind: "specials", number: null },
      displayNumber: null,
    });
    expect(specials.episodes.map((episode) => episode.id)).toEqual(["specials-0-ep"]);
    expect(movie).toMatchObject({
      id: "collapsed-movie",
      kind: "movie",
      title: "",
      titleFallback: { kind: "movie", number: null },
      displayNumber: null,
    });
    expect(movie.episodes.map((episode) => episode.id)).toEqual(["movie-1-ep"]);
    // Unknown kinds stay individual and still defer with their raw kind.
    expect(cour.id).toBe("cour-x");
    expect(cour.title).toBe("");
    expect(cour.titleFallback).toEqual({ kind: "cour", number: 3 });
  });

  it("keeps decimal numbers for split episodes", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-4", title: null, titles: {} },
      graphVersion: "graph-10",
      groups: [
        {
          id: "season-1",
          kind: "season",
          number: 1,
          title: null,
          episodes: [
            {
              id: "episode-12-5",
              number: 12.5,
              title: null,
              tmdb: { show: 100, season: 1, episode: 13 },
            },
          ],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout);
    expect(group.episodes[0].episodeNumber).toBe(12.5);
    expect(group.episodes[0].armNumber).toBe(12.5);
    expect(group.episodes[0].name).toBe("");
  });

  it("proxies raw TMDB still paths through the gateway and resizes absolute URLs", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-5", title: null, titles: {} },
      graphVersion: "graph-11",
      groups: [
        {
          id: "season-1",
          kind: "season",
          number: 1,
          title: null,
          episodes: [
            {
              id: "episode-raw",
              number: 1,
              title: null,
              stillPath: "/abc.jpg",
            },
            {
              id: "episode-absolute",
              number: 2,
              title: null,
              stillPath: "https://image.tmdb.org/t/p/original/def.jpg",
            },
          ],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout, {
      imageBaseUrl: "http://localhost:5001/",
    });
    expect(group.episodes[0].stillPath).toBe("http://localhost:5001/media/tmdb/t/p/w500/abc.jpg");
    expect(group.episodes[1].stillPath).toBe("https://image.tmdb.org/t/p/w500/def.jpg");
  });
});

describe("ARM episode group collapsing", () => {
  function layoutWith(
    groups: {
      id: string;
      kind: string;
      number: number;
      episodes: { id: string; number: number }[];
    }[],
  ): ArmEpisodeLayoutResponse {
    return {
      work: { id: "work-20", title: null, titles: {} },
      graphVersion: "graph-20",
      groups: groups.map((group) => ({
        id: group.id,
        kind: group.kind,
        number: group.number,
        title: null,
        episodes: group.episodes.map((episode) => ({
          id: episode.id,
          number: episode.number,
          title: `Title ${episode.id}`,
        })),
      })),
    };
  }

  it("merges multiple movie groups into one entry with episodes in stable group-then-episode order", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        {
          id: "movie-1",
          kind: "movie",
          number: 1,
          episodes: [
            { id: "movie-1-ep-a", number: 1 },
            { id: "movie-1-ep-b", number: 2 },
          ],
        },
        {
          id: "movie-2",
          kind: "movie",
          number: 2,
          episodes: [
            { id: "movie-2-ep-a", number: 1 },
            { id: "movie-2-ep-b", number: 2 },
          ],
        },
      ]),
    );

    expect(groups).toHaveLength(1);
    const [collapsed] = groups;
    expect(collapsed.id).toBe("collapsed-movie");
    expect(collapsed.kind).toBe("movie");
    expect(collapsed.title).toBe("");
    expect(collapsed.titleFallback).toEqual({ kind: "movie", number: null });
    expect(collapsed.episodes.map((episode) => episode.id)).toEqual([
      "movie-1-ep-a",
      "movie-1-ep-b",
      "movie-2-ep-a",
      "movie-2-ep-b",
    ]);
    // Episode identity stays attached to the source entry so watched/history/streams keep working.
    expect(collapsed.episodes.map((episode) => episode.armEpisodeId)).toEqual([
      "movie-1-ep-a",
      "movie-1-ep-b",
      "movie-2-ep-a",
      "movie-2-ep-b",
    ]);
    expect(collapsed.episodes.map((episode) => episode.armEntryId)).toEqual([
      "movie-1",
      "movie-1",
      "movie-2",
      "movie-2",
    ]);
  });

  it("merges multiple specials groups into one entry", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        {
          id: "specials-a",
          kind: "specials",
          number: 1,
          episodes: [{ id: "special-a-ep", number: 1 }],
        },
        {
          id: "specials-b",
          kind: "specials",
          number: 2,
          episodes: [{ id: "special-b-ep", number: 1 }],
        },
      ]),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("collapsed-specials");
    expect(groups[0].kind).toBe("specials");
    expect(groups[0].titleFallback).toEqual({ kind: "specials", number: null });
    expect(groups[0].episodes.map((episode) => episode.armEpisodeId)).toEqual([
      "special-a-ep",
      "special-b-ep",
    ]);
  });

  it("merges multiple sides groups into one entry and orders it between seasons and specials", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "season-1", kind: "season", number: 1, episodes: [{ id: "s1e1", number: 1 }] },
        { id: "sides-b", kind: "sides", number: 2, episodes: [{ id: "side-b-ep", number: 1 }] },
        { id: "specials-a", kind: "specials", number: 3, episodes: [{ id: "sp1", number: 1 }] },
        { id: "sides-a", kind: "sides", number: 4, episodes: [{ id: "side-a-ep", number: 1 }] },
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      "season-1",
      "collapsed-sides",
      "collapsed-specials",
    ]);
    const sides = groups[1];
    expect(sides.kind).toBe("sides");
    expect(sides.title).toBe("");
    expect(sides.titleFallback).toEqual({ kind: "sides", number: null });
    // Both sides groups merged, episodes keep source-entry identity in backend order.
    expect(sides.episodes.map((episode) => episode.armEpisodeId)).toEqual(["side-b-ep", "side-a-ep"]);
    expect(sides.episodes.map((episode) => episode.armEntryId)).toEqual(["sides-b", "sides-a"]);

    // Kind-priority ordering keeps sides between seasons and specials.
    expect(orderGroupsByKind(groups).map((group) => group.id)).toEqual([
      "season-1",
      "collapsed-sides",
      "collapsed-specials",
    ]);

    expect(finalizeGroupTitle(sides, tRu)).toBe("Сайды");
    expect(finalizeGroupTitle(sides, tEn)).toBe("Side stories");
  });

  it("merges multiple ova groups into one entry labeled OVA", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "season-1", kind: "season", number: 1, episodes: [{ id: "s1e1", number: 1 }] },
        { id: "ova-a", kind: "ova", number: 1, episodes: [{ id: "ova-ep-1", number: 1 }] },
        { id: "ova-b", kind: "ova", number: 2, episodes: [{ id: "ova-ep-2", number: 1 }] },
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual(["season-1", "collapsed-ova"]);
    const ova = groups[1];
    expect(ova.kind).toBe("ova");
    expect(ova.titleFallback).toEqual({ kind: "ova", number: null });
    expect(ova.episodes.map((episode) => episode.armEpisodeId)).toEqual(["ova-ep-1", "ova-ep-2"]);
    expect(ova.episodes.map((episode) => episode.armEntryId)).toEqual(["ova-a", "ova-b"]);

    expect(finalizeGroupTitle(ova, tRu)).toBe("OVA");
    expect(finalizeGroupTitle(ova, tEn)).toBe("OVA");
  });

  it("keeps seasons individual and season-first in the backend kind order (movie before specials)", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "season-1", kind: "season", number: 1, episodes: [{ id: "s1e1", number: 1 }] },
        { id: "specials-a", kind: "specials", number: 1, episodes: [{ id: "sp1", number: 1 }] },
        { id: "season-2", kind: "season", number: 2, episodes: [{ id: "s2e1", number: 1 }] },
        { id: "specials-b", kind: "specials", number: 2, episodes: [{ id: "sp2", number: 1 }] },
        { id: "movie-1", kind: "movie", number: 1, episodes: [{ id: "mv1", number: 1 }] },
      ]),
    );

    expect(groups.map((group) => group.id)).toEqual([
      "season-1",
      "collapsed-specials",
      "season-2",
      "collapsed-movie",
    ]);
    // Seasons keep their own ids, numbers and fallback descriptors.
    expect(groups[0].titleFallback).toEqual({ kind: "season", number: 1 });
    expect(groups[2].titleFallback).toEqual({ kind: "season", number: 2 });
    expect(groups[1].episodes.map((episode) => episode.armEpisodeId)).toEqual(["sp1", "sp2"]);

    // Kind-priority ordering (what the section applies before picking the default group) mirrors the
    // backend rank season < sides < movie < ova < specials and keeps the default selection a season.
    const ordered = orderGroupsByKind(groups);
    expect(ordered.map((group) => group.id)).toEqual([
      "season-1",
      "season-2",
      "collapsed-movie",
      "collapsed-specials",
    ]);
    expect(ordered[0].kind).toBe("season");
  });

  it("finalizes collapsed entries to the localized kind label via the existing helpers", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "specials-a", kind: "specials", number: 1, episodes: [{ id: "sp1", number: 1 }] },
        { id: "movie-1", kind: "movie", number: 1, episodes: [{ id: "mv1", number: 1 }] },
      ]),
    );

    expect(finalizeGroupTitle(groups[0], tRu)).toBe("Спешлы");
    expect(finalizeGroupTitle(groups[1], tRu)).toBe("Фильмы");
    expect(finalizeGroupTitle(groups[0], tEn)).toBe("Specials");
    expect(finalizeGroupTitle(groups[1], tEn)).toBe("Movies");
  });

  it("drops episodes with neither a title nor a still from collapsed entries", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        {
          id: "movie-1",
          kind: "movie",
          number: 1,
          episodes: [
            { id: "mv-titled", number: 1 },
            { id: "mv-empty", number: 2 },
          ],
        },
      ]),
    );
    // The fixture titles every episode; both survive the displayability filter.
    const [collapsed] = groups;
    expect(collapsed.episodes.map((episode) => episode.id)).toEqual(["mv-titled", "mv-empty"]);

    const bare = toEpisodeGroupPresentations({
      ...layoutWith([]),
      groups: [
        {
          id: "movie-1",
          kind: "movie",
          number: 1,
          title: null,
          episodes: [
            {
              id: "mv-titled",
              number: 1,
              title: null,
              stillPath: "/still.jpg",
            },
            {
              id: "mv-empty",
              number: 2,
              title: null,
            },
          ],
        },
      ],
    });
    expect(bare[0].episodes.map((episode) => episode.id)).toEqual(["mv-titled"]);
  });

  it("skips the collapsed entry entirely when no episode is displayable", () => {
    const groups = toEpisodeGroupPresentations({
      ...layoutWith([]),
      groups: [
        {
          id: "specials-1",
          kind: "specials",
          number: 1,
          title: null,
          episodes: [
            {
              id: "sp-empty",
              number: 1,
              title: null,
            },
          ],
        },
      ],
    });
    expect(groups).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import { toEpisodeGroupPresentations, toProvisionalGroupPresentations } from "./episodeLayoutModel";
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
  it("keeps Potok group and episode identities while exposing TMDB only as a projection", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-7",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-1",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "cour-2",
          kind: "cour",
          displayNumber: 2,
          sortPosition: 2,
          displayTitle: {
            value: "Сезон 1 · Часть 2",
            requestedLocale: "ru-RU",
            resolvedLocale: "ru-RU",
            role: "official",
            usedFallback: false,
          },
          episodes: [
            {
              id: "episode-13",
              groupId: "cour-2",
              ordinal: "13",
              sortPosition: 13,
              displayTitle: {
                value: "Продолжение",
                requestedLocale: "ru-RU",
                resolvedLocale: "ru-RU",
                role: "official",
                usedFallback: false,
              },
              displaySeasonNumber: 1,
              displayEpisodeNumber: 13,
              overview: "Описание",
              stillPath: "/still.jpg",
              airDate: "2025-01-01",
              annotation: {
                episodeId: "episode-13",
                resolutionState: "disputed",
                relation: "mixed",
                recommendation: "optional",
                confidence: 0.72,
                evidence: [],
              },
              providerReferences: [
                { provider: "tmdb", entityKind: "tv-episode", value: "100/1/13" },
                { provider: "mal", entityKind: "anime-episode", value: "200/13" },
              ],
            },
          ],
        },
      ],
    };

    expect(toEpisodeGroupPresentations(layout)).toEqual([
      {
        id: "cour-2",
        kind: "cour",
        title: "Сезон 1 · Часть 2",
        displayNumber: 2,
        episodes: [
          {
            id: "episode-13",
            name: "Продолжение",
            overview: "Описание",
            episodeNumber: 13,
            seasonNumber: 1,
            airDate: "2025-01-01",
            stillPath: "/still.jpg",
            armEpisodeId: "episode-13",
            armGroupId: "cour-2",
            armOrderingId: "ordering-default",
            armOrdinal: "13",
            tmdbSeasonNumber: 1,
            tmdbEpisodeNumber: 13,
            armAnnotation: {
              episodeId: "episode-13",
              resolutionState: "disputed",
              relation: "mixed",
              recommendation: "optional",
              confidence: 0.72,
              evidence: [],
            },
          },
        ],
      },
    ]);
  });

  it("does not invent a TMDB coordinate for an ARM-only episode", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-8",
      resolutionState: "partial",
      coverageState: "partial",
      warnings: [],
      workId: "work-2",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "ova",
          kind: "ova",
          sortPosition: 1,
          displayTitle: {
            value: "OVA",
            requestedLocale: "ru-RU",
            resolvedLocale: "ru-RU",
            role: "common",
            usedFallback: false,
          },
          episodes: [
            {
              id: "episode-ova",
              groupId: "ova",
              ordinal: "OVA 1",
              sortPosition: 1,
              displayTitle: null,
              providerReferences: [],
            },
          ],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout);
    expect(group.episodes[0]).toMatchObject({
      id: "episode-ova",
      name: "OVA 1",
      armEpisodeId: "episode-ova",
      armOrdinal: "OVA 1",
    });
    expect(group.episodes[0].tmdbSeasonNumber).toBeUndefined();
    expect(group.episodes[0].tmdbEpisodeNumber).toBeUndefined();
  });

  it("defers untitled season groups to a localized fallback and keeps episodes nameless", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-9",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-3",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "season-1",
          kind: "season",
          displayNumber: 1,
          sortPosition: 2,
          displayTitle: { value: "", role: "official", usedFallback: false },
          episodes: [
            {
              id: "episode-1",
              groupId: "season-1",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: null,
              providerReferences: [],
            },
          ],
        },
        {
          id: "specials",
          kind: "special",
          sortPosition: 1,
          displayTitle: null,
          names: [{ value: "  ", role: "common" }, { value: "Extras", role: "common" }],
          episodes: [],
        },
      ],
    };

    const groups = toEpisodeGroupPresentations(layout);

    // Sorted by sortPosition, not by payload order.
    expect(groups.map((group) => group.id)).toEqual(["specials", "season-1"]);

    const season = groups[1];
    expect(season.title).toBe("");
    expect(season.titleFallback).toEqual({ kind: "season", number: 1 });
    // A numeric ordinal must not be echoed as the name — the card renders the number alone.
    expect(season.episodes[0].name).toBe("");

    const specials = groups[0];
    expect(specials.title).toBe("Extras");
    expect(specials.titleFallback).toBeUndefined();
  });

  it("collapses untitled specials/movie groups into one kind-labeled entry each", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-12",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-6",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "specials-0",
          kind: "specials",
          displayNumber: 0,
          sortPosition: 1,
          displayTitle: null,
          episodes: [
            {
              id: "specials-0-ep",
              groupId: "specials-0",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: { value: "Special One", requestedLocale: "en", resolvedLocale: "en", role: "official", usedFallback: false },
              providerReferences: [],
            },
          ],
        },
        {
          id: "movie-1",
          kind: "movie",
          displayNumber: 1,
          sortPosition: 2,
          displayTitle: null,
          episodes: [
            {
              id: "movie-1-ep",
              groupId: "movie-1",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: { value: "Movie One", requestedLocale: "en", resolvedLocale: "en", role: "official", usedFallback: false },
              providerReferences: [],
            },
          ],
        },
        {
          id: "cour-x",
          kind: "cour",
          sortPosition: 3,
          displayTitle: null,
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
    expect(cour.titleFallback).toEqual({ kind: "cour", number: null });
  });

  it("keeps decimal display numbers for split episodes", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-10",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-4",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "season-1",
          kind: "season",
          displayNumber: 1,
          sortPosition: 1,
          displayTitle: null,
          episodes: [
            {
              id: "episode-12-5",
              groupId: "season-1",
              ordinal: "12.5",
              sortPosition: 12.5,
              displayTitle: null,
              displaySeasonNumber: 1,
              displayEpisodeNumber: 12.5,
              providerReferences: [],
            },
          ],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout);
    expect(group.episodes[0].episodeNumber).toBe(12.5);
    expect(group.episodes[0].name).toBe("");
  });

  it("proxies raw TMDB still paths through the gateway and resizes absolute URLs", () => {
    const layout: ArmEpisodeLayoutResponse = {
      graphVersion: "graph-11",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-5",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: [
        {
          id: "season-1",
          kind: "season",
          displayNumber: 1,
          sortPosition: 1,
          displayTitle: null,
          episodes: [
            {
              id: "episode-raw",
              groupId: "season-1",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: null,
              stillPath: "/abc.jpg",
              providerReferences: [],
            },
            {
              id: "episode-absolute",
              groupId: "season-1",
              ordinal: "2",
              sortPosition: 2,
              displayTitle: null,
              stillPath: "https://image.tmdb.org/t/p/original/def.jpg",
              providerReferences: [],
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

  it("maps the provisional layout to legacy coordinates without Potok identity", () => {
    const groups = toProvisionalGroupPresentations(
      {
        groups: [
          {
            kind: "season",
            displayNumber: 2,
            sortPosition: 2,
            displayTitle: "Второй сезон",
            episodes: [
              {
                displaySeasonNumber: 2,
                displayEpisodeNumber: 3,
                displayTitle: "Серия 3",
                overview: "Описание",
                stillPath: "/prov.jpg",
                airDate: "2025-02-02",
              },
            ],
          },
          {
            kind: "season",
            displayNumber: 1,
            sortPosition: 1,
            displayTitle: null,
            episodes: [
              { displaySeasonNumber: 1, displayEpisodeNumber: 1, displayTitle: null },
            ],
          },
        ],
      },
      { imageBaseUrl: "http://localhost:5001" },
    );

    expect(groups.map((group) => group.displayNumber)).toEqual([1, 2]);

    const [first, second] = groups;
    expect(first.title).toBe("");
    expect(first.titleFallback).toEqual({ kind: "season", number: 1 });
    expect(first.episodes[0]).toEqual({
      id: "provisional-1-1",
      name: "",
      overview: undefined,
      episodeNumber: 1,
      seasonNumber: 1,
      airDate: undefined,
      stillPath: undefined,
    });
    expect(first.episodes[0].armEpisodeId).toBeUndefined();

    expect(second.title).toBe("Второй сезон");
    expect(second.episodes[0]).toMatchObject({
      name: "Серия 3",
      episodeNumber: 3,
      seasonNumber: 2,
      stillPath: "http://localhost:5001/media/tmdb/t/p/w500/prov.jpg",
    });
    expect(second.episodes[0].armEpisodeId).toBeUndefined();
  });

  it("collapses untitled provisional specials groups (TMDB season 0) into kind-labeled entries", () => {
    const groups = toProvisionalGroupPresentations({
      groups: [
        {
          kind: "specials",
          displayNumber: 0,
          sortPosition: 0,
          displayTitle: null,
          episodes: [{ displaySeasonNumber: 0, displayEpisodeNumber: 1, displayTitle: "Special One" }],
        },
        {
          kind: "movie",
          displayNumber: null,
          sortPosition: 1,
          displayTitle: null,
          episodes: [{ displaySeasonNumber: null, displayEpisodeNumber: 1, displayTitle: "Movie One" }],
        },
      ],
    });

    expect(groups[0].id).toBe("collapsed-specials");
    expect(groups[0].kind).toBe("specials");
    expect(groups[0].title).toBe("");
    expect(groups[0].titleFallback).toEqual({ kind: "specials", number: null });
    expect(groups[0].episodes.map((episode) => episode.id)).toEqual(["provisional-0-1"]);
    expect(groups[1].id).toBe("collapsed-movie");
    expect(groups[1].kind).toBe("movie");
    expect(groups[1].titleFallback).toEqual({ kind: "movie", number: null });
  });
});

describe("ARM episode group collapsing", () => {
  function layoutWith(
    groups: {
      id: string;
      kind: string;
      sortPosition: number;
      displayNumber?: number;
      episodes: { id: string; sortPosition: number; ordinal?: string }[];
    }[],
  ): ArmEpisodeLayoutResponse {
    return {
      graphVersion: "graph-20",
      resolutionState: "resolved",
      coverageState: "complete",
      warnings: [],
      workId: "work-20",
      ordering: { id: "ordering-default", kind: "potokDefault", isDefault: true },
      groups: groups.map((group) => ({
        id: group.id,
        kind: group.kind,
        displayNumber: group.displayNumber,
        sortPosition: group.sortPosition,
        displayTitle: null,
        episodes: group.episodes.map((episode) => ({
          id: episode.id,
          groupId: group.id,
          ordinal: episode.ordinal ?? episode.id,
          sortPosition: episode.sortPosition,
          displayTitle: {
            value: `Title ${episode.id}`,
            requestedLocale: "en",
            resolvedLocale: "en",
            role: "official",
            usedFallback: false,
          },
          providerReferences: [],
        })),
      })),
    };
  }

  it("merges multiple movie groups into one entry with episodes in stable group-then-episode order", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        {
          id: "movie-2",
          kind: "movie",
          sortPosition: 2,
          episodes: [
            { id: "movie-2-ep-b", sortPosition: 2 },
            { id: "movie-2-ep-a", sortPosition: 1 },
          ],
        },
        {
          id: "movie-1",
          kind: "movie",
          sortPosition: 1,
          episodes: [
            { id: "movie-1-ep-b", sortPosition: 2 },
            { id: "movie-1-ep-a", sortPosition: 1 },
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
    // Episode identity stays attached to the source group so watched/history/streams keep working.
    expect(collapsed.episodes.map((episode) => episode.armEpisodeId)).toEqual([
      "movie-1-ep-a",
      "movie-1-ep-b",
      "movie-2-ep-a",
      "movie-2-ep-b",
    ]);
    expect(collapsed.episodes.map((episode) => episode.armGroupId)).toEqual([
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
          id: "specials-b",
          kind: "specials",
          sortPosition: 2,
          episodes: [{ id: "special-b-ep", sortPosition: 1 }],
        },
        {
          id: "specials-a",
          kind: "specials",
          sortPosition: 1,
          episodes: [{ id: "special-a-ep", sortPosition: 1 }],
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

  it("keeps seasons individual and season-first when specials sort between them", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "season-1", kind: "season", sortPosition: 1, displayNumber: 1, episodes: [{ id: "s1e1", sortPosition: 1 }] },
        { id: "specials-a", kind: "specials", sortPosition: 2, episodes: [{ id: "sp1", sortPosition: 1 }] },
        { id: "season-2", kind: "season", sortPosition: 3, displayNumber: 2, episodes: [{ id: "s2e1", sortPosition: 1 }] },
        { id: "specials-b", kind: "specials", sortPosition: 4, episodes: [{ id: "sp2", sortPosition: 1 }] },
        { id: "movie-1", kind: "movie", sortPosition: 5, episodes: [{ id: "mv1", sortPosition: 1 }] },
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

    // Kind-priority ordering (what the section applies before picking the default group) puts both
    // seasons ahead of the collapsed specials/movies, so the default selection stays a season.
    const ordered = orderGroupsByKind(groups);
    expect(ordered.map((group) => group.id)).toEqual([
      "season-1",
      "season-2",
      "collapsed-specials",
      "collapsed-movie",
    ]);
    expect(ordered[0].kind).toBe("season");
  });

  it("finalizes collapsed entries to the localized kind label via the existing helpers", () => {
    const groups = toEpisodeGroupPresentations(
      layoutWith([
        { id: "specials-a", kind: "specials", sortPosition: 1, episodes: [{ id: "sp1", sortPosition: 1 }] },
        { id: "movie-1", kind: "movie", sortPosition: 2, episodes: [{ id: "mv1", sortPosition: 1 }] },
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
          sortPosition: 1,
          episodes: [
            { id: "mv-titled", sortPosition: 1 },
            { id: "mv-empty", sortPosition: 2 },
          ],
        },
      ]),
    );
    // The fixture titles every episode; strip the second one down to a bare number card.
    const [collapsed] = groups;
    expect(collapsed.episodes.map((episode) => episode.id)).toEqual(["mv-titled", "mv-empty"]);

    const bare = toEpisodeGroupPresentations({
      ...layoutWith([]),
      groups: [
        {
          id: "movie-1",
          kind: "movie",
          sortPosition: 1,
          displayTitle: null,
          episodes: [
            {
              id: "mv-titled",
              groupId: "movie-1",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: null,
              stillPath: "/still.jpg",
              providerReferences: [],
            },
            {
              id: "mv-empty",
              groupId: "movie-1",
              ordinal: "2",
              sortPosition: 2,
              displayTitle: null,
              providerReferences: [],
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
          sortPosition: 1,
          displayTitle: null,
          episodes: [
            {
              id: "sp-empty",
              groupId: "specials-1",
              ordinal: "1",
              sortPosition: 1,
              displayTitle: null,
              providerReferences: [],
            },
          ],
        },
      ],
    });
    expect(groups).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import type { TFunction } from "i18next";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import {
  collapseKindGroupPresentations,
  overlayTmdbEpisodeMeta,
  toEpisodeGroupPresentations,
} from "./episodeLayoutModel";
import { ApiClient } from "../../network/ApiClient";
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
      work: { id: "work-1" },
      graphVersion: "graph-7",
      groups: [
        {
          id: "cour-2",
          kind: "season",
          number: 2,
          tmdbShow: 100,
          tmdbSeason: 1,
          episodes: [
            {
              id: "episode-13",
              number: 13,
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
        title: "",
        titleFallback: { kind: "season", number: 2 },
        displayNumber: 2,
        tmdbShow: 100,
        tmdbSeason: 1,
        episodes: [
          {
            id: "episode-13",
            name: "",
            episodeNumber: 13,
            seasonNumber: 2,
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
      work: { id: "work-2" },
      graphVersion: "graph-8",
      groups: [
        {
          id: "ova",
          kind: "ova",
          number: 1,
          episodes: [{ id: "episode-ova", number: 1 }],
        },
      ],
    };

    const [group] = toEpisodeGroupPresentations(layout);
    expect(group.episodes[0]).toMatchObject({
      id: "episode-ova",
      name: "",
      armEpisodeId: "episode-ova",
      armEntryId: "ova",
      armNumber: 1,
      filler: null,
    });
    expect(group.episodes[0].tmdbSeasonNumber).toBeUndefined();
    expect(group.episodes[0].tmdbEpisodeNumber).toBeUndefined();
  });

  it("defers season groups to a localized fallback and keeps episodes nameless", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-3" },
      graphVersion: "graph-9",
      groups: [
        {
          id: "season-1",
          kind: "season",
          number: 1,
          episodes: [{ id: "episode-1", number: 1 }],
        },
      ],
    };

    const [season] = toEpisodeGroupPresentations(layout);
    expect(season.title).toBe("");
    expect(season.titleFallback).toEqual({ kind: "season", number: 1 });
    expect(season.episodes[0].name).toBe("");
  });

  it("keeps decimal numbers for split episodes", () => {
    const layout: ArmEpisodeLayoutResponse = {
      work: { id: "work-4" },
      graphVersion: "graph-10",
      groups: [
        {
          id: "season-1",
          kind: "season",
          number: 1,
          episodes: [
            {
              id: "episode-12-5",
              number: 12.5,
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
});

describe("ARM episode TMDB overlay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("overlays group titles and episode display fields by the bridge coordinates", async () => {
    vi.spyOn(ApiClient, "fetchTvSeason").mockResolvedValue({
      id: 1,
      name: "Сезон 1",
      seasonNumber: 1,
      episodes: [
        {
          id: 900,
          name: "Пилот",
          overview: "Описание",
          episodeNumber: 1,
          seasonNumber: 1,
          airDate: "2025-01-01",
          stillPath: "http://gw/media/tmdb/t/p/original/still.jpg",
        },
      ],
    });

    const groups = toEpisodeGroupPresentations({
      work: { id: "work-10" },
      graphVersion: "graph-30",
      groups: [
        {
          id: "season-1",
          kind: "season",
          number: 1,
          tmdbShow: 100,
          tmdbSeason: 1,
          episodes: [
            { id: "ep-1", number: 1, tmdb: { show: 100, season: 1, episode: 1 } },
            { id: "ep-2", number: 2 }, // unbridged: stays bare
          ],
        },
      ],
    });

    const [overlaid] = await overlayTmdbEpisodeMeta(groups);

    expect(overlaid.title).toBe("Сезон 1");
    expect(overlaid.episodes[0]).toMatchObject({
      id: "ep-1",
      name: "Пилот",
      overview: "Описание",
      stillPath: "http://gw/media/tmdb/t/p/original/still.jpg",
      airDate: "2025-01-01",
    });
    expect(overlaid.episodes[1].name).toBe("");
    expect(overlaid.episodes[1].stillPath).toBeUndefined();
  });

  it("stays bare when the group is unbridged or the fetch fails", async () => {
    vi.spyOn(ApiClient, "fetchTvSeason").mockRejectedValue(new Error("network down"));

    const groups = toEpisodeGroupPresentations({
      work: { id: "work-11" },
      graphVersion: "graph-31",
      groups: [
        {
          id: "season-fail",
          kind: "season",
          number: 1,
          tmdbShow: 100,
          tmdbSeason: 9,
          episodes: [{ id: "ep-f", number: 1, tmdb: { show: 100, season: 9, episode: 1 } }],
        },
        {
          id: "season-unbridged",
          kind: "season",
          number: 2,
          episodes: [{ id: "ep-u", number: 1 }],
        },
      ],
    });

    const [failed, unbridged] = await overlayTmdbEpisodeMeta(groups);
    expect(failed.title).toBe("");
    expect(failed.episodes[0].name).toBe("");
    expect(unbridged.title).toBe("");
    expect(ApiClient.fetchTvSeason).toHaveBeenCalledTimes(1); // unbridged groups never fetch
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
      work: { id: "work-20" },
      graphVersion: "graph-20",
      groups: groups.map((group) => ({
        id: group.id,
        kind: group.kind,
        number: group.number,
        episodes: group.episodes.map((episode) => ({
          id: episode.id,
          number: episode.number,
        })),
      })),
    };
  }

  /** Collapse after a synthetic overlay — the same order the hook uses at runtime. */
  function present(layout: ArmEpisodeLayoutResponse) {
    const bare = toEpisodeGroupPresentations(layout);
    // Tests exercise structure only: mark every episode displayable, as a title overlay would.
    const overlaid = bare.map((group) => ({
      ...group,
      episodes: group.episodes.map((episode) => ({ ...episode, name: `Title ${episode.id}` })),
    }));
    return collapseKindGroupPresentations(overlaid);
  }

  it("merges multiple movie groups into one entry with episodes in stable group-then-episode order", () => {
    const groups = present(
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
    expect(collapsed.episodes.map((episode) => episode.armEntryId)).toEqual([
      "movie-1",
      "movie-1",
      "movie-2",
      "movie-2",
    ]);
  });

  it("merges multiple sides groups into one entry and orders it between seasons and specials", () => {
    const groups = present(
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
    expect(sides.titleFallback).toEqual({ kind: "sides", number: null });
    expect(sides.episodes.map((episode) => episode.armEntryId)).toEqual(["sides-b", "sides-a"]);

    expect(orderGroupsByKind(groups).map((group) => group.id)).toEqual([
      "season-1",
      "collapsed-sides",
      "collapsed-specials",
    ]);

    expect(finalizeGroupTitle(sides, tRu)).toBe("Сайды");
    expect(finalizeGroupTitle(sides, tEn)).toBe("Side stories");
  });

  it("finalizes collapsed entries to the localized kind label via the existing helpers", () => {
    const groups = present(
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
    const bare = toEpisodeGroupPresentations(
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
    // Only one episode gets overlaid (title) — the other stays bare and is dropped.
    const overlaid = bare.map((group) => ({
      ...group,
      episodes: group.episodes.map((episode) =>
        episode.id === "mv-titled" ? { ...episode, name: "Title" } : episode),
    }));
    const [collapsed] = collapseKindGroupPresentations(overlaid);
    expect(collapsed.episodes.map((episode) => episode.id)).toEqual(["mv-titled"]);
  });

  it("skips the collapsed entry entirely when no episode is displayable", () => {
    const groups = collapseKindGroupPresentations(
      toEpisodeGroupPresentations(
        layoutWith([
          { id: "specials-1", kind: "specials", number: 1, episodes: [{ id: "sp-empty", number: 1 }] },
        ]),
      )
    );
    expect(groups).toEqual([]);
  });
});

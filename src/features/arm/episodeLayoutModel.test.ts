import { describe, expect, it } from "vitest";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import { toEpisodeGroupPresentations, toProvisionalGroupPresentations } from "./episodeLayoutModel";

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
});

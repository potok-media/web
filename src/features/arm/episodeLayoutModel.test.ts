import { describe, expect, it } from "vitest";
import type { ArmEpisodeLayoutResponse } from "../../network/ArmTypes";
import { toEpisodeGroupPresentations } from "./episodeLayoutModel";

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
      armEpisodeId: "episode-ova",
      armOrdinal: "OVA 1",
    });
    expect(group.episodes[0].tmdbSeasonNumber).toBeUndefined();
    expect(group.episodes[0].tmdbEpisodeNumber).toBeUndefined();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { ApiClient } from "../../network/ApiClient";
import type { ArmEpisodeLayoutResponse, ArmLayoutGroup } from "../../network/ArmTypes";
import { finalizeGroupTitle } from "../../components/seasonGroupLabels";
import { overlayTmdbEpisodeMeta, toEpisodeGroupPresentations } from "./episodeLayoutModel";
import { toArmOverrideGroups } from "../../components/common/episodeSelector/armOverrideModel";
import { summarizeArmGroups } from "./armGroupDisplay";
import ru from "../../i18n/locales/ru.json";
import en from "../../i18n/locales/en.json";

const i18n = createInstance();
await i18n.init({ lng: "ru", fallbackLng: "en", resources: { ru, en }, defaultNS: "media" });
const tRu = i18n.getFixedT("ru", "media");
const tEn = i18n.getFixedT("en", "media");

function layout(titles: string[], show = 700): ArmEpisodeLayoutResponse {
  return {
    work: { id: "work" }, graphVersion: "display-regression",
    groups: titles.map((title, index) => ({
      id: `entry-${index}`, kind: "season", number: index + 1, title,
      tmdbShow: show, tmdbSeason: 1,
      episodes: [{ id: `episode-${index}`, number: 1, tmdb: { show, season: 1, episode: index + 1 } }],
    })),
  };
}

function labels(groups: ReturnType<typeof toEpisodeGroupPresentations>, language = "ru") {
  return groups.map(group => finalizeGroupTitle(group, language === "ru" ? tRu : tEn));
}

afterEach(() => vi.restoreAllMocks());

describe("source-owned anime group labels", () => {
  it.each([
    {
      name: "ordinal seasons with a split cour",
      titles: ["Example", "Example 2nd Season", "Example 2nd Season Part 2", "Example 3rd Season", "Example 4th Season"],
      expected: ["Сезон 1", "Сезон 2, часть 1", "Сезон 2, часть 2", "Сезон 3", "Сезон 4"],
    },
    {
      name: "season numbers after Season and a named final season",
      titles: ["Example", "Example Season 2", "Example Season 3", "Example Season 3 Part 2", "Example: The Final Season", "Example: The Final Season Part 2"],
      expected: ["Сезон 1", "Сезон 2", "Сезон 3, часть 1", "Сезон 3, часть 2", "Example: The Final Season — Часть 1", "Example: The Final Season — Часть 2"],
    },
    {
      name: "parts without a season number (86)",
      titles: ["86: Eighty Six", "86: Eighty Six Part 2"],
      expected: ["Часть 1", "Часть 2"],
    },
    {
      name: "named arcs without invented season numbers",
      titles: ["Kimetsu no Yaiba", "Kimetsu no Yaiba: Mugen Ressha-hen (TV)", "Kimetsu no Yaiba: Yuukaku-hen"],
      expected: ["Kimetsu no Yaiba", "Kimetsu no Yaiba: Mugen Ressha-hen (TV)", "Kimetsu no Yaiba: Yuukaku-hen"],
    },
  ])("preserves $name before and after the TMDB overlay", async ({ titles, expected }) => {
    vi.spyOn(ApiClient, "fetchTvSeason").mockResolvedValue({
      id: 1, name: "Сезон 1", seasonNumber: 1,
      episodes: titles.map((_, index) => ({ id: index, name: `Episode ${index + 1}`, episodeNumber: index + 1, seasonNumber: 1 })),
    });
    const source = layout(titles);
    const bare = toEpisodeGroupPresentations(source);
    expect(labels(bare)).toEqual(expected);
    const overlaid = await overlayTmdbEpisodeMeta(bare);
    expect(labels(overlaid)).toEqual(expected);
    expect(overlaid.map(group => group.displayNumber)).toEqual(source.groups.map(group => group.number));
    expect(overlaid.flatMap(group => group.episodes.map(episode => episode.armEpisodeId)))
      .toEqual(source.groups.flatMap(group => group.episodes.map(episode => episode.id)));
    expect(overlaid.map(group => group.episodes[0].tmdbSeasonNumber)).toEqual(titles.map(() => 1));
    expect(overlaid[0].episodes[0].name).toBe("Episode 1");
    expect(toArmOverrideGroups(source).map(group => finalizeGroupTitle({ ...group, episodes: [] }, tRu)))
      .toEqual(expected);
  });

  it("localizes season and part labels in English", () => {
    expect(labels(toEpisodeGroupPresentations(layout(["Example", "Example 2nd Season", "Example 2nd Season Part 2"])), "en"))
      .toEqual(["Season 1", "Season 2, part 1", "Season 2, part 2"]);
  });

  it("keeps unrelated season bases, roman numerals, and unrecognized subtitles intact", () => {
    const titles = ["Alpha 2nd Season", "Beta 2nd Season", "86", "Alpha II: The Beginning", "Alpha Season 3 - Revised"];
    expect(labels(toEpisodeGroupPresentations(layout(titles)))).toEqual(titles);
  });

  it("does not shorten numbered entries from unrelated series", () => {
    const titles = ["Alpha", "Beta 2nd Season"];
    expect(labels(toEpisodeGroupPresentations(layout(titles)))).toEqual(titles);
    expect(summarizeArmGroups(layout(titles).groups)).toEqual({ kind: "parts", count: 2 });
  });

  it("counts distinct seasons, excluding empty entries, movies, and sides", () => {
    const groups = layout(["Example", "Example 2nd Season", "Example 2nd Season Part 2", "Example 3rd Season"]).groups;
    groups.push(
      { id: "empty", kind: "season", number: 5, title: "Example 4th Season", episodes: [] },
      { id: "movie", kind: "movie", number: 1, title: "Movie", episodes: [{ id: "m", number: 1 }] },
      { id: "side", kind: "sides", number: 1, title: "Side", episodes: [{ id: "s", number: 1 }] },
    );
    expect(summarizeArmGroups(groups)).toEqual({ kind: "seasons", count: 3 });
    expect(labels(toEpisodeGroupPresentations({ work: { id: "w" }, graphVersion: "v", groups })))
      .toEqual(["Сезон 1", "Сезон 2, часть 1", "Сезон 2, часть 2", "Сезон 3", "Movie", "Side"]);
  });

  it.each([
    ["86: Eighty Six", "86: Eighty Six Part 2"],
    ["Example", "Example: The Final Season", "Example: The Final Season Part 2"],
    ["Mushoku Tensei", "Mushoku Tensei Part 2", "Mushoku Tensei II", "Mushoku Tensei II Part 2"],
  ])("counts parts when a season number is not explicit: %s", (...titles) => {
    expect(summarizeArmGroups(layout(titles).groups)).toEqual({ kind: "parts", count: titles.length });
  });

  it("keeps source labels when the overlay fails or has a misleading named season", async () => {
    const source = layout(["Example", "Example 2nd Season", "Example 2nd Season Part 2"], 780);
    vi.spyOn(ApiClient, "fetchTvSeason").mockRejectedValue(new Error("offline"));
    expect(labels(await overlayTmdbEpisodeMeta(toEpisodeGroupPresentations(source))))
      .toEqual(["Сезон 1", "Сезон 2, часть 1", "Сезон 2, часть 2"]);
    source.groups.forEach(group => { group.tmdbShow = 781; });
    vi.spyOn(ApiClient, "fetchTvSeason").mockResolvedValue({ id: 1, name: "Unrelated Arc", seasonNumber: 1, episodes: [] });
    expect(labels(await overlayTmdbEpisodeMeta(toEpisodeGroupPresentations(source))))
      .toEqual(["Сезон 1", "Сезон 2, часть 1", "Сезон 2, часть 2"]);
  });

  it("uses neutral labels when the AniList title is missing", () => {
    const groups: ArmLayoutGroup[] = [{ id: "missing", kind: "season", number: 3, aniListId: 100, episodes: [{ id: "e", number: 1 }] }];
    expect(labels(toEpisodeGroupPresentations({ work: { id: "w" }, graphVersion: "v", groups }))).toEqual(["Часть 3"]);
    expect(summarizeArmGroups(groups)).toEqual({ kind: "parts", count: 1 });
  });

  it("preserves generic fallback and counts for TMDB-only layouts", () => {
    const groups: ArmLayoutGroup[] = [1, 2, 3].map(number => ({ id: `g${number}`, kind: "season", number, episodes: [{ id: `e${number}`, number: 1 }] }));
    expect(labels(toEpisodeGroupPresentations({ work: { id: "w" }, graphVersion: "v", groups })))
      .toEqual(["Сезон 1", "Сезон 2", "Сезон 3"]);
    expect(summarizeArmGroups(groups)).toEqual({ kind: "seasons", count: 3 });
    expect(summarizeArmGroups([])).toEqual({ kind: "seasons", count: 0 });
  });
});

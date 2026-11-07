import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { ArmEntryDetail } from "../../network/ArmTypes";
import {
  animeExternalLinks,
  buildArmAnimeMedia,
  selectAnimeDescription,
  selectAnimeTitle,
  selectArmAnimeEntry,
  stripAnimeMarkup,
  type ArmAnimeDetailsInput,
} from "./armAnimeMedia";

const tStub = ((key: string, options?: { count?: number; defaultValue?: string }) => {
  if (options?.defaultValue !== undefined) return options.defaultValue;
  if (options?.count !== undefined) return `${key}:${options.count}`;
  return key;
}) as TFunction;

const makeEntry = (overrides: Partial<ArmEntryDetail> = {}): ArmEntryDetail => ({
  entryId: "entry-1",
  kind: "season",
  number: 1,
  sortPosition: 0,
  structureSource: "anilist",
  externalIds: [],
  localizedTitles: [{ language: "ru", value: "Тестовое аниме" }],
  tmdb: null,
  displayMetadata: {
    cover: { large: "https://img/cover.jpg", medium: null },
    genres: ["Action", "Fantasy"],
    tags: [],
    score: 87,
    studios: [],
    description: "<p>Anilist description</p>",
    synonyms: [],
    format: "TV",
    status: "RELEASING",
    episodeCount: 24,
    durationMinutes: 24,
    season: null,
    seasonYear: 2024,
    startDate: "2024-04-01",
    endDate: null,
    source: null,
    isAdult: false,
    popularity: null,
    siteUrl: "https://anilist.co/anime/1",
    banner: "https://img/banner.jpg",
    shikimoriDescription: "[b]Русское описание[/b]<br>вторая строка",
  },
  ...overrides,
});

const makeInput = (entries: ArmEntryDetail[], overrides: Partial<ArmAnimeDetailsInput> = {}): ArmAnimeDetailsInput => ({
  workId: "work-1",
  entries,
  episodes: [],
  ...overrides,
});

describe("selectArmAnimeEntry", () => {
  it("honors the deep-link group id", () => {
    const first = makeEntry({ entryId: "entry-1" });
    const second = makeEntry({ entryId: "entry-2" });
    expect(selectArmAnimeEntry([first, second], "entry-2")?.entryId).toBe("entry-2");
  });

  it("falls back to the first entry with anime metadata, then to the first entry", () => {
    const bare = makeEntry({ entryId: "bare", displayMetadata: null });
    const anime = makeEntry({ entryId: "anime" });
    expect(selectArmAnimeEntry([bare, anime], null)?.entryId).toBe("anime");
    const onlyBare = makeEntry({ entryId: "only-bare", displayMetadata: null });
    expect(selectArmAnimeEntry([onlyBare], null)?.entryId).toBe("only-bare");
    expect(selectArmAnimeEntry([], null)).toBeNull();
  });
});

describe("stripAnimeMarkup", () => {
  it("strips HTML and bbcode, keeps line breaks", () => {
    expect(stripAnimeMarkup("[b]Жирный[/b]<br>строка два")).toBe("Жирный\nстрока два");
    expect(stripAnimeMarkup("<p>Первый</p><p>Второй</p>")).toBe("Первый\n\nВторой");
    expect(stripAnimeMarkup("[url=https://x]ссылка[/url]")).toBe("ссылка");
    expect(stripAnimeMarkup("")).toBeNull();
    expect(stripAnimeMarkup(null)).toBeNull();
  });
});

describe("selectAnimeTitle", () => {
  it("prefers exact locale, then language prefix, then the first stored title", () => {
    const entry = makeEntry({
      localizedTitles: [
        { language: "en", value: "English" },
        { language: "ru", value: "Русский" },
      ],
    });
    expect(selectAnimeTitle(entry, "ru")).toBe("Русский");
    expect(selectAnimeTitle(entry, "ru-RU")).toBe("Русский");
    expect(selectAnimeTitle(entry, "en-US")).toBe("English");
    expect(selectAnimeTitle(makeEntry({ localizedTitles: [] }), "ru")).toBe("—");
  });
});

describe("selectAnimeDescription", () => {
  it("ru locale prefers Shikimori, other locales prefer AniList, with cross-fallback", () => {
    const entry = makeEntry();
    expect(selectAnimeDescription(entry, "ru")).toBe("Русское описание\nвторая строка");
    expect(selectAnimeDescription(entry, "en")).toBe("Anilist description");

    const anilistOnly = makeEntry({ displayMetadata: { ...makeEntry().displayMetadata!, shikimoriDescription: null } });
    expect(selectAnimeDescription(anilistOnly, "ru")).toBe("Anilist description");

    const shikimoriOnly = makeEntry({ displayMetadata: { ...makeEntry().displayMetadata!, description: null } });
    expect(selectAnimeDescription(shikimoriOnly, "en")).toBe("Русское описание\nвторая строка");
  });
});

describe("animeExternalLinks", () => {
  it("builds links only for ids the graph carries", () => {
    const entry = makeEntry({
      externalIds: [
        { provider: "mal", entityKind: "anime", value: "16498" },
        { provider: "anilist", entityKind: "anime", value: "16498" },
      ],
    });
    const links = animeExternalLinks(entry);
    expect(links).toEqual([
      { id: "mal", label: "MAL", url: "https://myanimelist.net/anime/16498" },
      { id: "shikimori", label: "Shikimori", url: "https://shikimori.io/animes/16498" },
      { id: "anilist", label: "AniList", url: "https://anilist.co/anime/1" },
    ]);
    expect(animeExternalLinks(makeEntry({ externalIds: [], displayMetadata: { ...makeEntry().displayMetadata!, siteUrl: null } }))).toEqual([]);
  });
});

describe("buildArmAnimeMedia", () => {
  it("synthesizes the media card from the entry metadata", () => {
    const media = buildArmAnimeMedia(makeInput([makeEntry()]), "ru", tStub);
    expect(media).toMatchObject({
      id: 0,
      title: "Тестовое аниме",
      mediaType: "tv",
      backdropSrc: "https://img/banner.jpg",
      posterSrc: "https://img/cover.jpg",
      year: 2024,
      genres: "Action, Fantasy",
      tmdbRating: 8.7,
      numberOfSeasons: 1,
      arm: { workId: "work-1", graphVersion: null },
    });
    expect(media?.overview).toBe("Русское описание\nвторая строка");
    // Format/status fall back to the raw AniList value through defaultValue.
    expect(media?.subtitle).toContain("TV");
    expect(media?.subtitle).toContain("RELEASING");
    expect(media?.subtitle).toContain("anime.episodesCount:24");
    expect(media?.subtitle).toContain("anime.minutes:24");
  });

  it("maps movie entries to the movie media type and marks adult titles", () => {
    const movie = makeEntry({ kind: "movie", displayMetadata: { ...makeEntry().displayMetadata!, isAdult: true, banner: null } });
    const media = buildArmAnimeMedia(makeInput([movie]), "en", tStub);
    expect(media?.mediaType).toBe("movie");
    expect(media?.ageRating).toBe("18+");
    expect(media?.backdropSrc).toBeUndefined();
    expect(media?.overview).toBe("Anilist description");
  });

  it("falls back to the episode count from the episode list when metadata has none", () => {
    const entry = makeEntry({
      displayMetadata: { ...makeEntry().displayMetadata!, episodeCount: null },
    });
    const input = makeInput([entry], {
      episodes: [
        { episodeId: "e1", groupId: "entry-1", number: 1, tmdb: null, localizedTitles: [], overview: null, stillPath: null, airDate: null, filler: null },
        { episodeId: "e2", groupId: "entry-1", number: 2, tmdb: null, localizedTitles: [], overview: null, stillPath: null, airDate: null, filler: null },
      ],
    });
    const media = buildArmAnimeMedia(input, "ru", tStub);
    expect(media?.subtitle).toContain("anime.episodesCount:2");
  });

  it("returns null for an empty work", () => {
    expect(buildArmAnimeMedia(makeInput([]), "ru", tStub)).toBeNull();
  });
});

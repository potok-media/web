import { describe, expect, it } from "vitest";
import {
  tmdbPosterSrc,
  userFolderItemToMediaCard,
  userStatusRecordToMediaCard,
} from "./mediaItemAdapters";
import type { UserFolderItem, UserStatusRecord } from "./types";

describe("tmdbPosterSrc", () => {
  it("expands a bare TMDB path into a w500 URL", () => {
    expect(tmdbPosterSrc("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
  });

  it("keeps full URLs untouched", () => {
    expect(tmdbPosterSrc("https://image.tmdb.org/t/p/w780/abc.jpg")).toBe(
      "https://image.tmdb.org/t/p/w780/abc.jpg",
    );
  });

  it("returns undefined for missing posters", () => {
    expect(tmdbPosterSrc(null)).toBeUndefined();
    expect(tmdbPosterSrc("")).toBeUndefined();
  });
});

describe("userStatusRecordToMediaCard", () => {
  it("maps a hydrated status record onto a MediaCard", () => {
    const record: UserStatusRecord = {
      tmdbId: "550",
      mediaType: "movie",
      title: "Fight Club",
      posterPath: "/abc.jpg",
      status: "watching",
    };
    const card = userStatusRecordToMediaCard(record);
    expect(card.id).toBe(550);
    expect(card.title).toBe("Fight Club");
    expect(card.mediaType).toBe("movie");
    expect(card.posterSrc).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
  });
});

describe("userFolderItemToMediaCard", () => {
  it("uses the persisted label and leaves the poster empty", () => {
    const item: UserFolderItem = {
      tmdbId: "1396",
      mediaType: "tv",
      label: "Breaking Bad",
      addedAt: "2026-11-01T00:00:00Z",
    };
    const card = userFolderItemToMediaCard(item);
    expect(card.id).toBe(1396);
    expect(card.title).toBe("Breaking Bad");
    expect(card.mediaType).toBe("tv");
    expect(card.posterSrc).toBeUndefined();
  });
});

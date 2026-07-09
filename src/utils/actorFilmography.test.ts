import { describe, expect, it } from "vitest";
import {
  deduplicateCredits,
  getYearFromDate,
  mapCreditToMediaCard,
  resolveProfileImageUrl,
} from "./actorFilmography";
import type { TmdbCreditItem } from "../network/ApiTypes";

describe("actorFilmography", () => {
  it("deduplicates credits by media type and id", () => {
    const items: TmdbCreditItem[] = [
      { id: 1, media_type: "movie", title: "A" },
      { id: 1, media_type: "movie", title: "A duplicate" },
      { id: 1, media_type: "tv", name: "Show" },
    ];

    expect(deduplicateCredits(items)).toHaveLength(2);
  });

  it("extracts release year from TMDB date strings", () => {
    expect(getYearFromDate("2020-05-12")).toBe("2020");
    expect(getYearFromDate(undefined)).toBe("");
    expect(getYearFromDate("invalid")).toBe("");
  });

  it("maps TMDB credit to MediaCard with gateway-relative poster", () => {
    const card = mapCreditToMediaCard(
      {
        id: 42,
        title: "Inception",
        poster_path: "/abc.jpg",
        media_type: "movie",
        vote_average: 8.8,
        release_date: "2010-07-16",
      },
      "https://gateway.test",
    );

    expect(card.id).toBe(42);
    expect(card.title).toBe("Inception");
    expect(card.posterSrc).toBe("https://gateway.test/media/tmdb/t/p/w342/abc.jpg");
    expect(card.subtitle).toBe("2010");
  });

  it("resolves absolute and relative profile image paths", () => {
    expect(resolveProfileImageUrl("https://cdn.test/p.jpg", "https://gw.test")).toBe(
      "https://cdn.test/p.jpg",
    );
    expect(resolveProfileImageUrl("/path.jpg", "https://gw.test")).toBe(
      "https://gw.test/media/tmdb/t/p/h632/path.jpg",
    );
    expect(resolveProfileImageUrl(null, "https://gw.test")).toBe("");
  });
});
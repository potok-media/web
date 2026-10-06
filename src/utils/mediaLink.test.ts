import { describe, expect, it } from "vitest";
import { mediaCardKey, mediaCardLink } from "./mediaLink";

describe("mediaCardLink", () => {
  it("links by the ARM potok identity when the card carries it", () => {
    expect(mediaCardLink({ id: 110911, mediaType: "tv", potokId: "a55f0dde-3277-4f6b-96fd-da7890d18fb1" }))
      .toBe("/media/p/a55f0dde-3277-4f6b-96fd-da7890d18fb1");
  });

  it("falls back to the tmdb-keyed legacy route without a potokId", () => {
    expect(mediaCardLink({ id: 204832, mediaType: "tv" })).toBe("/media/tv/204832");
    expect(mediaCardLink({ id: 603, mediaType: "movie" })).toBe("/media/movie/603");
  });

  it("defaults a missing mediaType to tv (calendar-style payloads)", () => {
    expect(mediaCardLink({ id: 1399 })).toBe("/media/tv/1399");
  });

  it("keeps the selected release in canonical links, including entries without TMDB", () => {
    expect(mediaCardLink({ id: 0, potokId: "work", entryId: "ova" }))
      .toBe("/media/p/work?g=ova");
    expect(mediaCardLink({ id: 30984, potokId: "work", entryId: "season-2" }))
      .toBe("/media/p/work?g=season-2");
  });

  it("preserves both the selected entry and autoplay in one query string", () => {
    const url = new URL(mediaCardLink({ id: 30984, potokId: "work", entryId: "season-2" }, { play: true }), "https://potok.test");
    expect(url.searchParams.get("g")).toBe("season-2");
    expect(url.searchParams.get("play")).toBe("true");
    expect(mediaCardLink({ id: 603, mediaType: "movie" }, { play: true }))
      .toBe("/media/movie/603?play=true");
  });

  it("gives seasons sharing a work and TMDB id different list identities", () => {
    const card = { id: 30984, mediaType: "tv", potokId: "work" };
    expect(mediaCardKey({ ...card, entryId: "season-1" }))
      .not.toBe(mediaCardKey({ ...card, entryId: "season-2" }));
    expect(mediaCardKey(card)).not.toBe(mediaCardKey({ ...card, potokId: "other-work" }));
    expect(mediaCardKey({ id: 1, mediaType: "movie" }))
      .not.toBe(mediaCardKey({ id: 1, mediaType: "tv" }));
  });
});

import { describe, expect, it } from "vitest";
import { mediaCardLink } from "./mediaLink";

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
});

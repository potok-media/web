import { describe, expect, it } from "vitest";
import { buildCoverCells, isEmptyCover, COVER_CELL_COUNT } from "./mosaicModel";
import type { PosterResolver } from "./mosaicModel";

const passthrough: PosterResolver = (src) => src ?? "";

describe("buildCoverCells", () => {
  it("maps at most four items, preserving order", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      tmdbId: `${i + 1}`,
      mediaType: "movie" as const,
      posterSrc: `/p${i + 1}.jpg`,
    }));
    const cells = buildCoverCells(items, passthrough);
    expect(cells).toHaveLength(COVER_CELL_COUNT);
    expect(cells.map((c) => c.src)).toEqual(["/p1.jpg", "/p2.jpg", "/p3.jpg", "/p4.jpg"]);
  });

  it("keeps a placeholder cell when a poster fails to resolve", () => {
    const items = [
      { tmdbId: "1", mediaType: "movie" as const, posterSrc: "/a.jpg" },
      { tmdbId: "2", mediaType: "tv" as const, posterSrc: null },
      { tmdbId: "3", mediaType: "movie" as const },
    ];
    const cells = buildCoverCells(items, passthrough);
    expect(cells).toEqual([
      { key: "movie:1", src: "/a.jpg" },
      { key: "tv:2", src: null },
      { key: "movie:3", src: null },
    ]);
  });

  it("treats an empty-string resolution as a placeholder", () => {
    const cells = buildCoverCells(
      [{ tmdbId: "1", mediaType: "movie" as const, posterSrc: "/x.jpg" }],
      () => "",
    );
    expect(cells[0].src).toBeNull();
  });

  it("uses the resolver output verbatim", () => {
    const resolve: PosterResolver = (src) => (src ? `https://gateway.example/media/tmdb/t/p/w500${src}` : "");
    const cells = buildCoverCells(
      [{ tmdbId: "550", mediaType: "movie" as const, posterSrc: "/abc.jpg" }],
      resolve,
    );
    expect(cells[0].src).toBe("https://gateway.example/media/tmdb/t/p/w500/abc.jpg");
  });

  it("keys cells by media type and tmdb id, falling back to the index", () => {
    const items = [
      { tmdbId: "", mediaType: "movie" as const, posterSrc: "/a.jpg" },
      { tmdbId: "42", mediaType: "tv" as const, posterSrc: "/b.jpg" },
    ];
    const cells = buildCoverCells(items, passthrough);
    expect(cells.map((c) => c.key)).toEqual(["movie:0", "tv:42"]);
  });

  it("returns an empty list for an empty folder", () => {
    expect(buildCoverCells([], passthrough)).toEqual([]);
  });
});

describe("isEmptyCover", () => {
  it("is true when no cell has a poster", () => {
    expect(isEmptyCover([{ key: "a", src: null }])).toBe(true);
    expect(isEmptyCover([])).toBe(true);
  });

  it("is false when any cell has a poster", () => {
    expect(
      isEmptyCover([
        { key: "a", src: null },
        { key: "b", src: "/b.jpg" },
      ]),
    ).toBe(false);
  });
});

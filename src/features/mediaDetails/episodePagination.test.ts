import { describe, expect, it } from "vitest";
import type { TvEpisode } from "../../network/ApiTypes";
import {
  clampEpisodePage,
  getEpisodeGridColumnCount,
  getEpisodePageSize,
  rankEpisodes,
} from "./episodePagination";

const episodes: TvEpisode[] = [
  { id: 3, name: "Third", episodeNumber: 3, seasonNumber: 1, airDate: "2024-01-03" },
  { id: 1, name: "First", episodeNumber: 1, seasonNumber: 1, airDate: "2024-01-01" },
  { id: 2, name: "Second", episodeNumber: 2, seasonNumber: 1, airDate: "2024-01-02" },
];

describe("episode pagination", () => {
  it("derives a responsive page size capped to three rows", () => {
    expect(getEpisodeGridColumnCount(256)).toBe(1);
    expect(getEpisodeGridColumnCount(1_344)).toBe(5);
    expect(getEpisodePageSize(5)).toBe(15);
  });

  it("ranks episodes by canonical number, release date, or watch state", () => {
    expect(rankEpisodes(episodes, "numberAsc", () => false).map((episode) => episode.id)).toEqual([1, 2, 3]);
    expect(rankEpisodes(episodes, "releaseDesc", () => false).map((episode) => episode.id)).toEqual([3, 2, 1]);
    expect(rankEpisodes(episodes, "unwatchedFirst", (episode) => episode.id === 1).map((episode) => episode.id)).toEqual([2, 3, 1]);
  });

  it("falls back to episode numbers when release dates are missing", () => {
    const undated = episodes.map((episode) => ({ ...episode, airDate: undefined }));
    expect(rankEpisodes(undated, "releaseDesc", () => false).map((episode) => episode.id)).toEqual([1, 2, 3]);
  });

  it("clamps a stale page when filtering or resizing reduces the page count", () => {
    expect(clampEpisodePage(4, 21, 10)).toBe(2);
    expect(clampEpisodePage(-1, 21, 10)).toBe(0);
  });
});

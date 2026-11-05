import { describe, expect, it } from "vitest";
import {
  continueActivityDay,
  groupContinueEpisodes,
  remainingMinutes,
} from "./continueGroups";
import type { ContinueWatchingEpisodeItem } from "../network/ApiTypes";

let seq = 0;

function episode(overrides: Partial<ContinueWatchingEpisodeItem> = {}): ContinueWatchingEpisodeItem {
  seq += 1;
  return {
    id: 1,
    title: "Show",
    mediaType: "tv",
    seasonNumber: 1,
    episodeNumber: seq,
    progressSeconds: 300,
    durationSeconds: 1800,
    progressPercent: 17,
    lastWatchedAt: "2026-11-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("groupContinueEpisodes", () => {
  it("groups by title preserving the endpoint's first-seen group order", () => {
    const items = [
      episode({ id: 10, title: "B", lastWatchedAt: "2026-11-01T10:00:00.000Z" }),
      episode({ id: 20, title: "A", lastWatchedAt: "2026-11-02T10:00:00.000Z" }),
      episode({ id: 10, title: "B", lastWatchedAt: "2026-11-03T10:00:00.000Z" }),
    ];

    const groups = groupContinueEpisodes(items);

    expect(groups.map((g) => g.id)).toEqual([10, 20]);
    expect(groups[0].episodes).toHaveLength(2);
    expect(groups[1].episodes).toHaveLength(1);
  });

  it("keeps episode order within a group untouched", () => {
    const items = [
      episode({ id: 10, seasonNumber: 1, episodeNumber: 1 }),
      episode({ id: 10, seasonNumber: 1, episodeNumber: 2 }),
      episode({ id: 10, seasonNumber: 2, episodeNumber: 1 }),
    ];

    const [group] = groupContinueEpisodes(items);

    expect(group.episodes.map((e) => [e.seasonNumber, e.episodeNumber])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
  });

  it("separates the same tmdb id by media type", () => {
    const items = [
      episode({ id: 5, mediaType: "tv" }),
      episode({ id: 5, mediaType: "movie", seasonNumber: null, episodeNumber: null }),
    ];

    const groups = groupContinueEpisodes(items);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.mediaType).sort()).toEqual(["movie", "tv"]);
  });

  it("marks movie groups and stamps them with their latest activity", () => {
    const items = [
      episode({ id: 7, mediaType: "movie", seasonNumber: null, episodeNumber: null }),
      episode({ id: 10, lastWatchedAt: "2026-11-01T08:00:00.000Z" }),
      episode({ id: 10, lastWatchedAt: "2026-11-03T09:30:00.000Z" }),
      episode({ id: 10, lastWatchedAt: undefined }),
    ];

    const groups = groupContinueEpisodes(items);
    const film = groups.find((g) => g.isFilm);
    const show = groups.find((g) => !g.isFilm);

    expect(film?.isFilm).toBe(true);
    expect(film?.lastActivityAt).toBe(Date.parse("2026-11-03T12:00:00.000Z"));
    expect(show?.lastActivityAt).toBe(Date.parse("2026-11-03T09:30:00.000Z"));
  });

  it("returns an empty list for no input", () => {
    expect(groupContinueEpisodes([])).toEqual([]);
  });
});

describe("continueActivityDay", () => {
  const now = new Date("2026-11-04T15:00:00").getTime();

  it("buckets same-day activity as today regardless of time", () => {
    expect(continueActivityDay("2026-11-04T00:10:00", now).kind).toBe("today");
    expect(continueActivityDay("2026-11-04T23:50:00", now).kind).toBe("today");
  });

  it("buckets yesterday across month boundaries", () => {
    const nov3 = new Date("2026-11-04T12:00:00").getTime();
    expect(continueActivityDay("2026-11-03T22:40:30", nov3).kind).toBe("yesterday");
    const mar1 = new Date("2026-03-01T12:00:00").getTime();
    expect(continueActivityDay("2026-02-28T23:59:00", mar1).kind).toBe("yesterday");
  });

  it("falls back to a concrete date for older activity", () => {
    const result = continueActivityDay("2026-11-01T10:00:00", now);
    expect(result.kind).toBe("date");
    expect(result.date?.getDate()).toBe(1);
  });

  it("returns a null date for unparseable input", () => {
    expect(continueActivityDay(undefined, now)).toEqual({ kind: "date", date: null });
    expect(continueActivityDay("not-a-date", now)).toEqual({ kind: "date", date: null });
  });
});

describe("remainingMinutes", () => {
  it("rounds the whole minutes left in a film row", () => {
    expect(remainingMinutes(1200, 3600)).toBe(40);
    expect(remainingMinutes(0, 90)).toBe(2);
    expect(remainingMinutes(3600, 3600)).toBe(0);
  });

  it("returns 0 when the duration is unknown", () => {
    expect(remainingMinutes(10, 0)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { buildSeasonStillMap } from "./useSeasonEpisodes";
import type { TvEpisode } from "../../network/ApiTypes";

const GATEWAY = "http://localhost:5000";

function ep(overrides: Partial<TvEpisode>): TvEpisode {
  return {
    id: 1,
    name: "Episode",
    episodeNumber: 1,
    seasonNumber: 1,
    ...overrides,
  } as TvEpisode;
}

describe("buildSeasonStillMap", () => {
  it("maps season:episode keys to gateway-proxied still urls", () => {
    const map = buildSeasonStillMap(
      [
        ep({ episodeNumber: 1, stillPath: "/a.jpg" }),
        ep({ episodeNumber: 2, still_path: "/b.jpg" }),
      ],
      GATEWAY,
    );
    expect(map.get("1:1")).toBe(`${GATEWAY}/media/tmdb/t/p/original/a.jpg`);
    expect(map.get("1:2")).toBe(`${GATEWAY}/media/tmdb/t/p/original/b.jpg`);
  });

  it("passes through absolute urls and skips episodes without a still", () => {
    const map = buildSeasonStillMap(
      [
        ep({ episodeNumber: 3, stillPath: "https://cdn.test/still.png" }),
        ep({ episodeNumber: 4 }),
        ep({ episodeNumber: 5, stillPath: "" }),
      ],
      GATEWAY,
    );
    expect(map.get("1:3")).toBe("https://cdn.test/still.png");
    expect(map.has("1:4")).toBe(false);
    expect(map.has("1:5")).toBe(false);
  });

  it("keys episodes by their own season number, not the fetched season", () => {
    const map = buildSeasonStillMap([ep({ seasonNumber: 2, episodeNumber: 1, stillPath: "/c.jpg" })], GATEWAY);
    expect(map.has("2:1")).toBe(true);
    expect(map.has("1:1")).toBe(false);
  });
});

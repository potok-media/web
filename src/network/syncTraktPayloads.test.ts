import { describe, expect, it } from "vitest";
import { traktBulkHistoryPayload, traktMediaPayload } from "./syncTraktPayloads";
import { normalizeGateway } from "../hooks/useProfileHandshake";

describe("traktMediaPayload", () => {
  it("builds movie payload", () => {
    expect(traktMediaPayload("42", "movie")).toEqual({
      movies: [{ ids: { tmdb: 42 } }],
      shows: [],
      episodes: [],
    });
  });

  it("builds tv episode payload", () => {
    expect(traktMediaPayload("10", "tv", 2, 5)).toEqual({
      movies: [],
      shows: [{
        ids: { tmdb: 10 },
        seasons: [{ number: 2, episodes: [{ number: 5 }] }],
      }],
      episodes: [],
    });
  });
});

describe("traktBulkHistoryPayload", () => {
  it("groups episodes by season", () => {
    const payload = traktBulkHistoryPayload("99", [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 2 },
      { seasonNumber: 2, episodeNumber: 3 },
    ]);
    expect(payload.shows[0].seasons).toHaveLength(2);
    expect(payload.shows[0].seasons?.[0].episodes).toHaveLength(2);
  });
});

describe("normalizeGateway", () => {
  it("adds https for hostnames", () => {
    expect(normalizeGateway("api.example.com").ok).toBe(true);
    expect(normalizeGateway("api.example.com").url).toBe("https://api.example.com");
  });

  it("adds http for localhost", () => {
    expect(normalizeGateway("localhost:8080").url).toBe("http://localhost:8080");
  });

  it("rejects empty input", () => {
    expect(normalizeGateway("  ").ok).toBe(false);
  });
});
import { describe, expect, it } from "vitest";
import { isHistoryEntryWatched } from "./mediaDetailsFetch";
import type { UserHistoryEntry } from "../../network/SyncApiClient";

const entry = (overrides: Partial<UserHistoryEntry>): UserHistoryEntry => ({
  tmdbId: "1399",
  mediaType: "tv",
  progressSeconds: 0,
  durationSeconds: 0,
  ...overrides,
});

describe("isHistoryEntryWatched (the server derivation, mirrored)", () => {
  it("counts the manual is_watched flag even at 0/0 progress", () => {
    expect(isHistoryEntryWatched(entry({ isWatched: true }))).toBe(true);
  });

  it("counts a flagged row carrying leftover progress", () => {
    expect(isHistoryEntryWatched(entry({ isWatched: true, progressSeconds: 50, durationSeconds: 600 }))).toBe(true);
  });

  it("counts real playback at ≥90%", () => {
    expect(isHistoryEntryWatched(entry({ progressSeconds: 540, durationSeconds: 600 }))).toBe(true);
    expect(isHistoryEntryWatched(entry({ progressSeconds: 600, durationSeconds: 600 }))).toBe(true);
  });

  it("rejects an unflagged 0/0 row and partial progress", () => {
    expect(isHistoryEntryWatched(entry({}))).toBe(false);
    expect(isHistoryEntryWatched(entry({ progressSeconds: 539, durationSeconds: 600 }))).toBe(false);
    expect(isHistoryEntryWatched(entry({ progressSeconds: 100, durationSeconds: 600 }))).toBe(false);
  });

  it("rejects zero-duration rows without the flag", () => {
    expect(isHistoryEntryWatched(entry({ progressSeconds: 100, durationSeconds: 0 }))).toBe(false);
  });
});

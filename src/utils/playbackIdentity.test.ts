import { describe, expect, it } from "vitest";
import { canSyncPlaybackIdentity, playbackStorageKeys } from "./playbackIdentity";

describe("playback identity after release binding", () => {
  const base = { id: 123, mediaType: "tv", workId: "work" };
  it("separates ARM-only episodes which both have no TMDB coordinates", () => {
    const first = { ...base, episodeId: "ova-1" };
    const second = { ...base, episodeId: "ova-2" };
    expect(playbackStorageKeys(first).resumeKey).not.toBe(playbackStorageKeys(second).resumeKey);
    expect(canSyncPlaybackIdentity(first)).toBe(true);
  });
  it("preserves numeric resume keys for verified compatibility references, including specials", () => {
    expect(playbackStorageKeys({ ...base, season: 0, episode: 3 }).resumeKey).toBe("potok_playback_resume:123:0:3");
  });
  it("stores joined-file resume independently without reporting a single episode", () => {
    const joined = { ...base, episodeId: "incorrect-primary", season: 1, episode: 1, episodeIds: ["e1", "e2"], progressId: "hash:0" };
    expect(canSyncPlaybackIdentity(joined)).toBe(false);
    expect(playbackStorageKeys(joined).resumeKey).toBe("potok_playback_resume:pid:hash%3A0");
  });
  it("keeps unresolved torrent files separate and out of episode history", () => {
    const file = { ...base, progressId: "hash:0" };
    expect(canSyncPlaybackIdentity(file)).toBe(false);
    expect(playbackStorageKeys(file)).not.toEqual(playbackStorageKeys({ ...file, progressId: "hash:1" }));
  });
  it("preserves movie resume and history behavior", () => {
    const movie = { id: 123, mediaType: "movie" };
    expect(canSyncPlaybackIdentity(movie)).toBe(true);
    expect(playbackStorageKeys(movie).resumeKey).toBe("potok_playback_resume:123:0:0");
  });
  it("does not sync malformed numeric coordinates", () => {
    expect(canSyncPlaybackIdentity({ ...base, season: 1, episode: 24.5 })).toBe(false);
    expect(canSyncPlaybackIdentity({ ...base, season: 1, episode: 0 })).toBe(false);
  });
});

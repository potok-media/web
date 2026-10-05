import { describe, expect, it } from "vitest";
import { toPlaybackProgressRequest } from "./playbackHistoryModel";

describe("playback history identity", () => {
  it("saves an ARM-only episode by Potok identity without requiring TMDB coordinates", () => {
    expect(toPlaybackProgressRequest({
      id: 777,
      mediaType: "tv",
      workId: "work-1",
      episodeId: "episode-ova-1",
    }, 95, 100, true)).toEqual({
      tmdbId: "777",
      mediaType: "episode",
      workId: "work-1",
      episodeId: "episode-ova-1",
      progressSeconds: 95,
      durationSeconds: 100,
      syncTrakt: true,
    });
  });
});

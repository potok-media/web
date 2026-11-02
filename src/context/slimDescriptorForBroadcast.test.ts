import { describe, expect, it } from "vitest";
import { slimDescriptorForBroadcast } from "./WatchTogetherContext";
import type { ActivePlayback } from "./playbackTypes";

function buildDescriptor(): ActivePlayback {
  return {
    streamUrl: "https://cdn.test/current.m3u8",
    title: "Serial",
    mediaType: "tv",
    id: 1,
    season: 1,
    episode: 3,
    audios: [{ name: "Dub", url: "https://cdn.test/current.m3u8?audio=0" }],
    playlist: [
      {
        id: "1:1",
        season: 1,
        episode: 1,
        title: "E1",
        streamUrl: "https://very-long-cdn.test/resolved/episode-1/index.m3u8?token=abcdef",
        headers: { Referer: "https://kodik.cc/" },
        audios: [{ name: "Dub", url: "https://very-long-cdn.test/resolved/episode-1/index.m3u8" }],
      },
      {
        id: "1:2",
        season: 1,
        episode: 2,
        title: "E2",
        streamUrl: "https://very-long-cdn.test/resolved/episode-2/index.m3u8?token=abcdef",
      },
    ],
    playlistIndex: 2,
  } as ActivePlayback;
}

describe("slimDescriptorForBroadcast", () => {
  it("keeps the active episode playable but strips per-episode urls/headers from playlist items", () => {
    const slim = slimDescriptorForBroadcast(buildDescriptor());

    // The current episode must remain fully playable on the guest.
    expect(slim.streamUrl).toBe("https://cdn.test/current.m3u8");
    expect(slim.season).toBe(1);
    expect(slim.episode).toBe(3);
    expect(slim.audios).toEqual([{ name: "Dub", url: "https://cdn.test/current.m3u8?audio=0" }]);

    // Items cross the wire as lobby metadata only.
    expect(slim.playlist).toHaveLength(2);
    expect(slim.playlist?.[0]).toEqual({ id: "1:1", season: 1, episode: 1, title: "E1" });
    expect(slim.playlist?.[1]).toEqual({ id: "1:2", season: 1, episode: 2, title: "E2" });
    expect(JSON.stringify(slim.playlist)).not.toContain("very-long-cdn.test");
    expect(slim.playlistIndex).toBe(2);
  });

  it("handles a descriptor without a playlist", () => {
    const slim = slimDescriptorForBroadcast({ ...buildDescriptor(), playlist: undefined });
    expect(slim.playlist).toBeUndefined();
    expect(slim.streamUrl).toBe("https://cdn.test/current.m3u8");
  });
});

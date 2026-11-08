import { describe, expect, it } from "vitest";
import { slimDescriptorForBroadcast } from "./WatchTogetherContext";
import type { ActivePlayback } from "./playbackTypes";

function buildDescriptor(): ActivePlayback {
  return {
    title: "Serial",
    mediaType: "tv",
    id: 1,
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
      {
        id: "1:3",
        season: 1,
        episode: 3,
        title: "E3",
        streamUrl: "https://very-long-cdn.test/resolved/episode-3/index.m3u8?token=abcdef",
      },
    ],
    playlistIndex: 2,
  };
}

describe("slimDescriptorForBroadcast", () => {
  it("keeps the current episode's item fully playable and strips urls from the rest", () => {
    const slim = slimDescriptorForBroadcast(buildDescriptor());

    // The current item must remain fully playable on the guest.
    expect(slim.playlist[2]).toMatchObject({
      id: "1:3",
      season: 1,
      episode: 3,
      streamUrl: "https://very-long-cdn.test/resolved/episode-3/index.m3u8?token=abcdef",
    });

    // Every other item crosses the wire as lobby metadata only.
    expect(slim.playlist).toHaveLength(3);
    expect(slim.playlist[0]).toEqual({ id: "1:1", season: 1, episode: 1, title: "E1" });
    expect(slim.playlist[1]).toEqual({ id: "1:2", season: 1, episode: 2, title: "E2" });
    expect(JSON.stringify(slim.playlist[0])).not.toContain("very-long-cdn.test");
    expect(JSON.stringify(slim.playlist[1])).not.toContain("very-long-cdn.test");
    expect(slim.playlistIndex).toBe(2);
    // R3: nothing content-ish at the top level at all.
    expect(JSON.stringify(slim)).not.toContain('"streamUrl":""');
  });

  it("moves the playable item with the index", () => {
    const slim = slimDescriptorForBroadcast({ ...buildDescriptor(), playlistIndex: 0 });
    expect(slim.playlist[0].streamUrl).toContain("episode-1");
    expect(slim.playlist[1]).toEqual({ id: "1:2", season: 1, episode: 2, title: "E2" });
  });
});

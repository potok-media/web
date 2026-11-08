import { describe, expect, it } from "vitest";
import type { SDKStreamEpisode, StreamEpisode } from "../sdk/src/types";
import { mapSdkStreamEpisodes } from "../components/common/extension/hostMedia/hostMediaMappers";
import { buildPlaybackFromInfo, mapStreamEpisode } from "./mediaStreamsPlayback";

const joinedTargets = [
  {
    episodeId: "episode-1",
    entryId: "entry-main",
  },
  {
    episodeId: "episode-2",
    entryId: "entry-main",
  },
];

describe("release binding host mappings", () => {
  it("keeps a joined file's full identity on the current playlist item without inventing a single episode", () => {
    const playback = buildPlaybackFromInfo({ title: "Joined" }, {
      mediaType: "tv", id: 123, workId: "work", episodeId: null,
      episodeIds: ["episode-1", "episode-2"], targets: joinedTargets,
    });
    expect(playback.playlist[0]).toMatchObject({
      workId: "work", episodeId: null, episodeIds: ["episode-1", "episode-2"], targets: joinedTargets,
    });
    expect(playback.playlist[0].season).toBeUndefined();
    expect(playback.playlist[0].episode).toBeUndefined();
  });
  it("preserves every canonical target for a joined release file", () => {
    const source: StreamEpisode = {
      id: "joined-file",
      title: "Episodes 1-2",
      url: "https://example.invalid/joined.m3u8",
      episodeIds: ["episode-1", "episode-2"],
      targets: joinedTargets,
      resolutionState: "resolved",
    };

    expect(mapStreamEpisode(source)).toMatchObject({
      episodeIds: ["episode-1", "episode-2"],
      targets: joinedTargets,
    });
  });

  it("carries the plugin-owned opaque progressId through to the episode item and playback", () => {
    const source: StreamEpisode = {
      id: "7",
      title: "Unmatched file",
      url: "https://example.invalid/file.m3u8",
      progressId: "opaque-plugin-token",
      resolutionState: "unresolved",
    };

    expect(mapStreamEpisode(source).progressId).toBe("opaque-plugin-token");

    const playback = buildPlaybackFromInfo(
      { title: "Unmatched file", progressId: "opaque-plugin-token" },
      { mediaType: "tv", id: 123, progressId: source.progressId },
    );
    expect(playback.playlist[0].progressId).toBe("opaque-plugin-token");
  });

  it("builds the playlist from response items and honors playlistIndex", () => {
    const playback = buildPlaybackFromInfo({
      title: "S1E1",
      playlist: [
        { id: "1", season: 1, episode: 1, title: "E1", streamUrl: "https://cdn.test/1.m3u8", streamType: "m3u8" },
        { id: "2", season: 1, episode: 2, title: "E2", streamUrl: "https://cdn.test/2.m3u8", streamType: "m3u8" },
      ],
      playlistIndex: 1,
    }, { mediaType: "tv", id: 123 });

    expect(playback.playlist).toHaveLength(2);
    expect(playback.playlistIndex).toBe(1);
    expect(playback.playlist[1].streamUrl).toBe("https://cdn.test/2.m3u8");
  });

  it("folds a legacy top-level streamUrl response into a single current item", () => {
    const legacy = {
      title: "E1",
      streamUrl: "https://cdn.test/legacy.m3u8",
      streamType: "m3u8",
      torrentHash: "abc",
      fileIndex: "0",
    } as unknown as import("../sdk/src/types").PlaybackInfo;

    const playback = buildPlaybackFromInfo(legacy, {
      mediaType: "tv", id: 123, season: 1, episode: 3, workId: "work", episodeId: "ep-3",
    });

    expect(playback.playlist).toHaveLength(1);
    expect(playback.playlist[0]).toMatchObject({
      streamUrl: "https://cdn.test/legacy.m3u8",
      streamType: "m3u8",
      streamHash: "abc",
      fileIndex: "0",
      season: 1,
      episode: 3,
      workId: "work",
      episodeId: "ep-3",
    });
  });

  it("patches an override window's current index with a legacy response's resolved content", () => {
    const legacy = {
      title: "E2",
      streamUrl: "https://cdn.test/resolved-2.m3u8",
      streamType: "m3u8",
    } as unknown as import("../sdk/src/types").PlaybackInfo;

    const playback = buildPlaybackFromInfo(legacy, {
      mediaType: "tv",
      id: 123,
      playlist: [
        { id: "1", season: 1, episode: 1, title: "E1", streamUrl: "https://cdn.test/1.m3u8" },
        { id: "2", season: 1, episode: 2, title: "E2", streamUrl: "https://cdn.test/stale-2.m3u8" },
      ],
      playlistIndex: 1,
    });

    expect(playback.playlist).toHaveLength(2);
    expect(playback.playlist[1].streamUrl).toBe("https://cdn.test/resolved-2.m3u8");
    expect(playback.playlist[1].title).toBe("E2");
    expect(playback.playlist[0].streamUrl).toBe("https://cdn.test/1.m3u8");
  });

  it("preserves additive targets across the declarative SDK host mapper", () => {
    const source: SDKStreamEpisode = {
      id: "joined-file",
      title: "Episodes 1-2",
      url: "https://example.invalid/joined.m3u8",
      episodeIds: ["episode-1", "episode-2"],
      targets: joinedTargets,
    };

    expect(mapSdkStreamEpisodes([source])[0]).toMatchObject({
      episodeIds: ["episode-1", "episode-2"],
      targets: joinedTargets,
    });
  });
});

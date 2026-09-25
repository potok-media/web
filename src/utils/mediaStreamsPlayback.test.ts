import { describe, expect, it } from "vitest";
import type { SDKStreamEpisode, StreamEpisode } from "../sdk/src/types";
import { mapSdkStreamEpisodes } from "../components/common/extension/hostMedia/hostMediaMappers";
import { buildPlaybackFromInfo, mapStreamEpisode } from "./mediaStreamsPlayback";

const joinedTargets = [
  {
    episodeId: "episode-1",
    orderingId: "ordering-default",
    groupId: "group-main",
    compatibility: { season: 1, episode: 1 },
  },
  {
    episodeId: "episode-2",
    orderingId: "ordering-default",
    groupId: "group-main",
    compatibility: { season: 1, episode: 2 },
  },
];

describe("release binding host mappings", () => {
  it("keeps a joined file's full identity without inventing a single episode for playback", () => {
    const playback = buildPlaybackFromInfo({ streamUrl: "https://example.invalid/joined.mp4", title: "Joined" }, {
      mediaType: "tv", id: 123, workId: "work", episodeId: null,
      episodeIds: ["episode-1", "episode-2"], targets: joinedTargets,
    });
    expect(playback).toMatchObject({
      workId: "work", episodeId: null, episodeIds: ["episode-1", "episode-2"], targets: joinedTargets,
    });
    expect(playback.season).toBeUndefined();
    expect(playback.episode).toBeUndefined();
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
      { streamUrl: "https://example.invalid/file.m3u8", title: "Unmatched file" },
      { mediaType: "tv", id: 123, progressId: source.progressId },
    );
    expect(playback.progressId).toBe("opaque-plugin-token");
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

import { describe, expect, it } from "vitest";
import type { SDKStreamEpisode, StreamEpisode } from "../sdk/src/types";
import { mapSdkStreamEpisodes } from "../components/common/extension/hostMedia/hostMediaMappers";
import { mapStreamEpisode } from "./mediaStreamsPlayback";

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

import { describe, expect, it, vi } from "vitest";
import {
  buildResumePlaylist,
  pickResumeEpisode,
  resumeContinueWatching,
  type ContinueResumeDeps,
} from "./continueWatchingResume";
import { clearPlaylistResolver, resolvePlaylistItem } from "./playlistResolver";
import type { ContinueWatchingCursor } from "./continueWatching";
import type { PlaybackInfo, StreamEpisode } from "@potok/sdk-types";

const WORK_ID = "11111111-2222-3333-4444-555555555555";
const EPISODE_ID = "123e4567-e89b-42d3-a456-426614174000";

function makeCursor(overrides: Partial<ContinueWatchingCursor> = {}): ContinueWatchingCursor {
  return {
    key: WORK_ID,
    workId: WORK_ID,
    mediaType: "tv",
    title: "Show",
    providerId: "potok-torrents",
    streamHash: "ABCDEF0123456789",
    fileIndex: "3",
    episodeId: EPISODE_ID,
    season: 1,
    episode: 3,
    progressSeconds: 300,
    durationSeconds: 1800,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<StreamEpisode> = {}): StreamEpisode {
  return {
    id: "1",
    season: 1,
    episode: 1,
    title: "Episode 1",
    ...overrides,
  } as StreamEpisode;
}

const INFO: PlaybackInfo = {
  streamUrl: "https://cdn.test/episode.m3u8",
  streamType: "m3u8",
} as PlaybackInfo;

describe("pickResumeEpisode", () => {
  const episodes = [
    makeEpisode({ id: "1", episode: 1 }),
    makeEpisode({ id: "3", episodeId: EPISODE_ID, episode: 3 }),
    makeEpisode({ id: "7", episode: 7 }),
  ];

  it("prefers the saved file index", () => {
    expect(pickResumeEpisode(episodes, makeCursor())?.id).toBe("3");
  });

  it("falls back to the ARM episode id", () => {
    expect(pickResumeEpisode(episodes, makeCursor({ fileIndex: undefined }))?.id).toBe("3");
  });

  it("falls back to season/episode coordinates", () => {
    expect(
      pickResumeEpisode(episodes, makeCursor({ fileIndex: undefined, episodeId: undefined, episode: 7 }))?.id,
    ).toBe("7");
  });

  it("falls back to the first episode and returns undefined for an empty list", () => {
    expect(pickResumeEpisode(episodes, makeCursor({ fileIndex: "99", episodeId: undefined, episode: 99 }))?.id).toBe("1");
    expect(pickResumeEpisode([], makeCursor())).toBeUndefined();
  });
});

describe("buildResumePlaylist", () => {
  it("maps episodes into playlist items carrying provider identity", () => {
    const playlist = buildResumePlaylist(
      [makeEpisode({ id: "3", episodeId: EPISODE_ID, workId: WORK_ID, episode: 3, url: "u" })],
      "potok-torrents",
    );
    expect(playlist).toHaveLength(1);
    expect(playlist[0]).toMatchObject({
      id: "3",
      workId: WORK_ID,
      episodeId: EPISODE_ID,
      episode: 3,
      streamUrl: "u",
      streamType: "m3u8",
      providerId: "potok-torrents",
    });
  });
});

describe("resumeContinueWatching", () => {
  function makeDeps(episodes: StreamEpisode[]): ContinueResumeDeps & {
    playVideo: ReturnType<typeof vi.fn>;
  } {
    return {
      requestEpisodes: vi.fn().mockResolvedValue({ episodes }),
      requestPlaybackInfo: vi.fn().mockResolvedValue(INFO),
      playVideo: vi.fn(),
    };
  }

  it("throws when the cursor has no provider to resume from", async () => {
    const deps = makeDeps([makeEpisode()]);
    await expect(resumeContinueWatching(makeCursor({ providerId: undefined }), deps)).rejects.toThrow();
    expect(deps.requestEpisodes).not.toHaveBeenCalled();
  });

  it("throws when the source returns no episodes", async () => {
    const deps = makeDeps([]);
    await expect(resumeContinueWatching(makeCursor(), deps)).rejects.toThrow();
  });

  it("resumes at the saved position for the same file", async () => {
    const episodes = [makeEpisode({ id: "2", episode: 2 }), makeEpisode({ id: "3", episode: 3 })];
    const deps = makeDeps(episodes);
    await resumeContinueWatching(makeCursor(), deps);

    expect(deps.requestEpisodes).toHaveBeenCalledWith(
      "potok-torrents",
      undefined,
      expect.objectContaining({ type: "tv", workId: WORK_ID, title: "Show" }),
    );
    expect(deps.requestPlaybackInfo).toHaveBeenCalledWith(
      "potok-torrents",
      expect.objectContaining({ episode: episodes[1], episodes }),
    );
    expect(deps.playVideo).toHaveBeenCalledTimes(1);
    const playback = deps.playVideo.mock.calls[0][0];
    expect(playback.streamUrl).toBe("https://cdn.test/episode.m3u8");
    expect(playback.providerId).toBe("potok-torrents");
    expect(playback.startAt).toBe(300);
    expect(playback.playlist).toHaveLength(2);
    expect(playback.playlistIndex).toBe(1);
    expect(playback.sourceStream).toBeUndefined();
  });

  it("starts from zero when the resolved episode differs from the saved file", async () => {
    const episodes = [makeEpisode({ id: "9", episode: 9 })];
    const deps = makeDeps(episodes);
    await resumeContinueWatching(makeCursor(), deps);
    const playback = deps.playVideo.mock.calls[0][0];
    expect(playback.startAt).toBe(0);
    expect(playback.playlistIndex).toBe(0);
  });

  it("installs a playlist resolver for in-player navigation", async () => {
    const episodes = [makeEpisode({ id: "3", url: "plugin://handle" })];
    const deps = makeDeps(episodes);
    await resumeContinueWatching(makeCursor(), deps);

    // The resolver is parked in the host registry and keyed to the playback's
    // instanceId by the playlist hook on first use.
    const playback = deps.playVideo.mock.calls[0][0];
    const info = await resolvePlaylistItem(
      { ...playback, instanceId: 501 },
      { id: "3", streamUrl: "plugin://handle" },
    );
    expect(info).toEqual(INFO);
    expect(deps.requestPlaybackInfo).toHaveBeenLastCalledWith(
      "potok-torrents",
      expect.objectContaining({ episode: expect.objectContaining({ id: "3" }) }),
    );
    clearPlaylistResolver(501);
  });

  it("works for progressId-keyed online sources without torrent identities", async () => {
    const cursor = makeCursor({
      providerId: "potok-online-balancers",
      progressId: "online-balancers://kodik/serial-1",
      streamHash: undefined,
      fileIndex: undefined,
    });
    const episodes = [makeEpisode({ id: "ep-1" })];
    const deps = makeDeps(episodes);
    await resumeContinueWatching(cursor, deps);
    expect(deps.requestPlaybackInfo).toHaveBeenCalled();
    const playback = deps.playVideo.mock.calls[0][0];
    expect(playback.providerId).toBe("potok-online-balancers");
    expect(playback.streamHash).toBeUndefined();
  });
});

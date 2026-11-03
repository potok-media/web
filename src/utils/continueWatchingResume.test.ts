import { describe, expect, it, vi } from "vitest";
import {
  buildResumePlaylist,
  cardProgressFromResume,
  findLedgerCursorForCard,
  isCardResumable,
  mergeLedgerLastSource,
  pickResumeEpisode,
  resumeContinueWatching,
  resumeCursorFromCard,
  type ContinueResumeDeps,
} from "./continueWatchingResume";
import { clearPlaylistResolver, resolvePlaylistItem } from "./playlistResolver";
import type { ContinueWatchingCursor } from "./continueWatching";
import type { MediaCard } from "../network/ApiTypes";
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

describe("resumeCursorFromCard", () => {
  function makeCard(overrides: Partial<MediaCard> = {}): MediaCard {
    return {
      id: 42,
      potokId: WORK_ID,
      title: "Show",
      mediaType: "tv",
      resume: {
        season: 1,
        episode: 3,
        progressSeconds: 300,
        durationSeconds: 1800,
        lastSource: {
          providerId: "potok-torrents",
          streamHash: "ABC",
          fileIndex: "3",
        },
      },
      ...overrides,
    };
  }

  it("builds a ledger-shaped cursor from the server resume payload", () => {
    const cursor = resumeCursorFromCard(makeCard())!;
    expect(cursor).toMatchObject({
      key: WORK_ID,
      workId: WORK_ID,
      tmdbId: 42,
      providerId: "potok-torrents",
      streamHash: "ABC",
      fileIndex: "3",
      season: 1,
      episode: 3,
      progressSeconds: 300,
      durationSeconds: 1800,
    });
  });

  it("passes the online sourceStream through verbatim", () => {
    const sourceStream = { id: "serial-1" };
    const card = makeCard({
      resume: {
        episode: 1,
        progressSeconds: 10,
        durationSeconds: 100,
        lastSource: { providerId: "potok-online-balancers", sourceStream },
      },
    });
    const cursor = resumeCursorFromCard(card)!;
    expect(cursor.providerId).toBe("potok-online-balancers");
    expect(cursor.sourceStream).toBe(sourceStream);
  });

  it("returns null for cards without a resume payload", () => {
    expect(resumeCursorFromCard(makeCard({ resume: undefined }))).toBeNull();
  });
});

describe("isCardResumable", () => {
  it("requires a saved lastSource with a provider", () => {
    const base: MediaCard = { id: 1, title: "T", mediaType: "movie" };
    expect(isCardResumable(base)).toBe(false);
    expect(isCardResumable({ ...base, resume: { progressSeconds: 5 } })).toBe(false);
    expect(
      isCardResumable({ ...base, resume: { lastSource: { providerId: "potok-torrents" } } }),
    ).toBe(true);
  });
});

describe("cardProgressFromResume", () => {
  const base: MediaCard = { id: 1, title: "T", mediaType: "tv" };

  it("derives the overlay percentage from the resume payload", () => {
    const card = cardProgressFromResume({
      ...base,
      resume: { season: 1, episode: 3, progressSeconds: 300, durationSeconds: 1800 },
    });
    expect(card.progress).toMatchObject({ percentage: 17, lastSeason: 1, lastEpisode: 3 });
  });

  it("augments a server progress object that lacks percentage, keeping next-episode fields", () => {
    const card = cardProgressFromResume({
      ...base,
      progress: {
        completed: 0,
        aired: 1,
        percentage: 0,
        nextSeason: 1,
        nextEpisode: 11,
      },
      resume: { progressSeconds: 278, durationSeconds: 1439 },
    });
    expect(card.progress).toMatchObject({
      percentage: 19,
      aired: 1,
      nextSeason: 1,
      nextEpisode: 11,
    });
  });

  it("keeps a populated percentage and skips cards without usable data", () => {
    const withProgress: MediaCard = {
      ...base,
      progress: { completed: 1, aired: 2, percentage: 55 },
      resume: { progressSeconds: 1, durationSeconds: 2 },
    };
    expect(cardProgressFromResume(withProgress).progress?.percentage).toBe(55);
    expect(cardProgressFromResume(base)).toBe(base);
    const zero = cardProgressFromResume({ ...base, resume: { progressSeconds: 0, durationSeconds: 0 } });
    expect(zero.progress).toBeUndefined();
  });
});

describe("mergeLedgerLastSource", () => {
  const base: MediaCard = { id: 42, potokId: WORK_ID, title: "Show", mediaType: "tv" };
  const ledgerCursor: ContinueWatchingCursor = {
    ...makeCursor(),
    audioName: "Оригинал",
    sourceStream: { id: "stream-1" },
  };

  it("splices the ledger source into server rows missing lastSource", () => {
    const [merged] = mergeLedgerLastSource([base], [ledgerCursor]);
    expect(merged.resume?.lastSource).toMatchObject({
      providerId: "potok-torrents",
      voice: "Оригинал",
      streamHash: "ABCDEF0123456789",
      fileIndex: "3",
      sourceStream: { id: "stream-1" },
    });
    expect(merged.resume?.episode).toBe(3);
  });

  it("leaves resumable cards and unmatched cards untouched", () => {
    const resumable: MediaCard = {
      ...base,
      resume: { lastSource: { providerId: "other" } },
    };
    const other: MediaCard = { ...base, id: 999, potokId: "99999999-9999-9999-9999-999999999999" };
    const [m1, m2] = mergeLedgerLastSource([resumable, other], [ledgerCursor]);
    expect(m1.resume?.lastSource?.providerId).toBe("other");
    expect(m2.resume).toBeUndefined();
  });

  it("is a no-op without ledger entries", () => {
    expect(mergeLedgerLastSource([base], [])).toEqual([base]);
  });
});

describe("findLedgerCursorForCard", () => {
  const ledger = [
    makeCursor({ key: WORK_ID, workId: WORK_ID, tmdbId: 42 }),
    makeCursor({ key: "tmdb:777", workId: undefined, tmdbId: 777 }),
  ];

  it("matches by ARM workId first", () => {
    expect(
      findLedgerCursorForCard({ potokId: WORK_ID, id: 999 }, ledger)?.tmdbId,
    ).toBe(42);
  });

  it("falls back to the tmdb id", () => {
    expect(
      findLedgerCursorForCard({ potokId: undefined, id: 777 }, ledger)?.key,
    ).toBe("tmdb:777");
  });

  it("returns undefined when nothing matches", () => {
    expect(findLedgerCursorForCard({ potokId: undefined, id: 1 }, ledger)).toBeUndefined();
  });
});

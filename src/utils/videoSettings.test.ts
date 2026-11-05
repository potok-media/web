import { describe, expect, it } from "vitest";
import {
  cursorFromVideoSettings,
  decodeVideoSettings,
  encodeVideoSettings,
  videoSettingsFromCard,
  videoSettingsFromCursor,
  VIDEO_SETTINGS_MAX_BYTES,
  type PluginVideoSettings,
  type TorrentVideoSettings,
} from "./videoSettings";
import type { MediaCard } from "../network/ApiTypes";
import type { ContinueWatchingCursor } from "./continueWatching";

const PLUGIN_SNAPSHOT: PluginVideoSettings = {
  v: 1,
  kind: "plugin",
  providerId: "potok-online-balancers",
  sourceStream: { id: "serial-1", voice: "Kodik" },
  season: 1,
  episode: 3,
  voice: "Озвучка",
  position: 300,
  tmdbId: 2316,
  audios: [
    { name: "AniDUB · 1080p · Kodik", voice: "AniDUB", providerId: "kodik", sourceId: "43" },
    { name: "AniLiberty", voice: "AniLiberty", providerId: "aniliberty", sourceId: "42" },
  ],
};

const TORRENT_SNAPSHOT: TorrentVideoSettings = {
  v: 1,
  kind: "torrent",
  providerId: "potok-torrents",
  sourceStream: { title: "Show S01", url: "https://torr/abc" },
  streamHash: "ABCDEF0123456789",
  fileIndex: "3",
  season: 1,
  episode: 3,
  position: 300,
};

describe("encode/decodeVideoSettings", () => {
  it("round-trips a plugin snapshot", () => {
    expect(decodeVideoSettings(encodeVideoSettings(PLUGIN_SNAPSHOT))).toEqual(PLUGIN_SNAPSHOT);
  });

  it("round-trips a torrent snapshot", () => {
    expect(decodeVideoSettings(encodeVideoSettings(TORRENT_SNAPSHOT))).toEqual(TORRENT_SNAPSHOT);
  });

  it("round-trips non-ASCII text (base64url keeps UTF-8 intact)", () => {
    const snap: PluginVideoSettings = { ...PLUGIN_SNAPSHOT, voice: "Оригинал · 日本語" };
    expect(decodeVideoSettings(encodeVideoSettings(snap))?.voice).toBe("Оригинал · 日本語");
  });

  it("decodes tampered/garbage payloads to null", () => {
    expect(decodeVideoSettings(null)).toBeNull();
    expect(decodeVideoSettings("")).toBeNull();
    expect(decodeVideoSettings("not-base64!!!")).toBeNull();
    const encoded = encodeVideoSettings(PLUGIN_SNAPSHOT);
    expect(decodeVideoSettings(encoded.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects payloads over the size cap", () => {
    expect(decodeVideoSettings("x".repeat(VIDEO_SETTINGS_MAX_BYTES + 1))).toBeNull();
  });

  it("rejects other schema versions and unknown kinds (version tolerance)", () => {
    const encoded = encodeVideoSettings(PLUGIN_SNAPSHOT);
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    expect(decodeVideoSettings(Buffer.from(JSON.stringify({ ...decoded, v: 2 }), "utf8").toString("base64url"))).toBeNull();
    expect(decodeVideoSettings(Buffer.from(JSON.stringify({ ...decoded, kind: "unknown" }), "utf8").toString("base64url"))).toBeNull();
  });

  it("rejects snapshots missing identity fields", () => {
    const withoutProvider = { ...PLUGIN_SNAPSHOT, providerId: "" };
    expect(decodeVideoSettings(encodeVideoSettings(withoutProvider as PluginVideoSettings))).toBeNull();
    const withoutStream = { ...TORRENT_SNAPSHOT, streamHash: "" };
    expect(decodeVideoSettings(encodeVideoSettings(withoutStream as TorrentVideoSettings))).toBeNull();
    const withoutPosition = { ...PLUGIN_SNAPSHOT, position: -5 };
    expect(decodeVideoSettings(encodeVideoSettings(withoutPosition))).toBeNull();
  });
});

describe("videoSettingsFromCard", () => {
  function makeCard(overrides: Partial<MediaCard> = {}): MediaCard {
    return {
      id: 42,
      potokId: "11111111-2222-3333-4444-555555555555",
      title: "Show",
      mediaType: "tv",
      resume: {
        season: 1,
        episode: 3,
        progressSeconds: 300,
        durationSeconds: 1800,
        lastSource: {
          providerId: "potok-online-balancers",
          voice: "Озвучка",
          sourceStream: { id: "serial-1" },
        },
      },
      ...overrides,
    };
  }

  it("derives a plugin snapshot from an online server card", () => {
    expect(videoSettingsFromCard(makeCard())).toEqual({
      v: 1,
      kind: "plugin",
      providerId: "potok-online-balancers",
      sourceStream: { id: "serial-1" },
      season: 1,
      episode: 3,
      voice: "Озвучка",
      position: 300,
      tmdbId: 42,
    });
  });

  it("carries the stored voice candidates through derivation and round-trip", () => {
    const card = makeCard({
      resume: {
        season: 1,
        episode: 3,
        progressSeconds: 300,
        durationSeconds: 1800,
        lastSource: {
          providerId: "potok-online-balancers",
          sourceStream: { id: "serial-1" },
          audios: [{ name: "AniLiberty", label: "AniLiberty", voice: "AniLiberty", providerId: "aniliberty", sourceId: "42", query: { id: "42" }, url: "https://cdn.test/x.m3u8" }] as unknown as import("../network/ApiTypes").LastSourceAudioCandidate[],
        },
      },
    });
    const snapshot = videoSettingsFromCard(card)!;
    expect(snapshot.audios).toEqual([
      { name: "AniLiberty", label: "AniLiberty", voice: "AniLiberty", providerId: "aniliberty", sourceId: "42", query: { id: "42" } },
    ]);
    expect(decodeVideoSettings(encodeVideoSettings(snapshot))).toEqual(snapshot);
  });

  it("derives a torrent snapshot (streamHash wins over sourceStream)", () => {
    const card = makeCard({
      resume: {
        season: 1,
        episode: 3,
        progressSeconds: 300,
        durationSeconds: 1800,
        lastSource: {
          providerId: "potok-torrents",
          streamHash: "ABC",
          fileIndex: "3",
          sourceStream: { title: "Show" },
        },
      },
    });
    expect(videoSettingsFromCard(card)).toEqual({
      v: 1,
      kind: "torrent",
      providerId: "potok-torrents",
      sourceStream: { title: "Show" },
      streamHash: "ABC",
      fileIndex: "3",
      season: 1,
      episode: 3,
      voice: undefined,
      position: 300,
      tmdbId: 42,
    });
  });

  it("derives nothing from cards without a usable source descriptor", () => {
    expect(videoSettingsFromCard(makeCard({ resume: undefined }))).toBeNull();
    expect(
      videoSettingsFromCard(
        makeCard({ resume: { progressSeconds: 5, lastSource: { providerId: "p" } } }),
      ),
    ).toBeNull();
  });
});

describe("videoSettingsFromCursor", () => {
  const base: ContinueWatchingCursor = {
    key: "tmdb:42",
    tmdbId: 42,
    mediaType: "tv",
    title: "Show",
    providerId: "potok-online-balancers",
    season: 1,
    episode: 3,
    progressSeconds: 300,
    durationSeconds: 1800,
    audioName: "Озвучка",
    sourceStream: { id: "serial-1" },
    updatedAt: Date.now(),
  };

  it("derives a plugin snapshot from a ledger cursor", () => {
    expect(videoSettingsFromCursor(base)).toEqual({
      v: 1,
      kind: "plugin",
      providerId: "potok-online-balancers",
      sourceStream: { id: "serial-1" },
      season: 1,
      episode: 3,
      voice: "Озвучка",
      position: 300,
      tmdbId: 42,
    });
  });

  it("derives a torrent snapshot from a torrent cursor (guest ledger included)", () => {
    const cursor: ContinueWatchingCursor = {
      ...base,
      providerId: "potok-torrents",
      streamHash: "ABC",
      fileIndex: "3",
      audioName: undefined,
    };
    const snapshot = videoSettingsFromCursor(cursor);
    expect(snapshot?.kind).toBe("torrent");
    expect(snapshot).toMatchObject({ streamHash: "ABC", fileIndex: "3", position: 300 });
  });

  it("derives nothing without a provider or source identity", () => {
    expect(videoSettingsFromCursor({ ...base, providerId: undefined })).toBeNull();
    expect(videoSettingsFromCursor({ ...base, sourceStream: undefined })).toBeNull();
  });
});

describe("cursorFromVideoSettings", () => {
  it("maps a plugin snapshot onto a minimal resume cursor", () => {
    const cursor = cursorFromVideoSettings(PLUGIN_SNAPSHOT);
    expect(cursor).toMatchObject({
      mediaType: "tv",
      providerId: "potok-online-balancers",
      sourceStream: { id: "serial-1" },
      season: 1,
      episode: 3,
      progressSeconds: 300,
      audioName: "Озвучка",
      streamHash: undefined,
      fileIndex: undefined,
      tmdbId: 2316,
      audios: PLUGIN_SNAPSHOT.audios,
    });
  });

  it("maps a torrent snapshot with the file anchor and infers movie type without episodes", () => {
    const movieSnap: TorrentVideoSettings = { ...TORRENT_SNAPSHOT, season: undefined, episode: undefined };
    const cursor = cursorFromVideoSettings(movieSnap);
    expect(cursor.mediaType).toBe("movie");
    expect(cursor.streamHash).toBe("ABCDEF0123456789");
    expect(cursor.fileIndex).toBe("3");
  });
});

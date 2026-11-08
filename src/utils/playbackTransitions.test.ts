import { describe, expect, it } from "vitest";
import type { ActivePlayback, PlaybackMeta } from "../context/playbackTypes";
import {
  getPlaybackPipelineKey,
  switchPlaybackSourceState,
} from "./playbackTransitions";
import { resolveExternalAudioIndex, isSameBaseStreamUrl } from "./audioTrackOwnership";

const playback: ActivePlayback = {
  title: "Дороро",
  mediaType: "tv",
  id: 345,
  instanceId: 41,
  startAtZero: true,
  playlist: [
    {
      id: "1:7",
      season: 1,
      episode: 7,
      title: "7 серия",
      streamUrl: "https://streams.test/dororo/anilibria.m3u8?audio=0",
      streamType: "m3u8",
      audios: [
        { name: "AniLibria", url: "https://streams.test/dororo/anilibria.m3u8?audio=0" },
        { name: "AnimeGo", url: "https://streams.test/dororo/animego.m3u8?audio=1" },
        { name: "AniLiberty", url: "https://streams.test/dororo/aniliberty.m3u8?audio=2" },
      ],
    },
    { id: "1:8", season: 1, episode: 8, title: "8 серия", streamUrl: "https://streams.test/dororo/8.m3u8" },
  ],
  playlistIndex: 0,
  subtitles: [{ label: "Русские", src: "https://streams.test/dororo/ru.vtt" }],
  duration: 1440,
};

describe("switchPlaybackSourceState", () => {
  it("patches the CURRENT playlist item's url/voice immutably, leaving the queue intact", () => {
    const playbackMeta: PlaybackMeta = {
      subtitles: [{ label: "Русские", src: "https://streams.test/dororo/ru.vtt" }],
      duration: 1440,
    };

    const next = switchPlaybackSourceState(
      { activePlayback: playback, playbackMeta },
      {
        streamUrl: playback.playlist[0].audios![1].url,
        streamType: "m3u8",
        voice: "AnimeGo",
        startAt: 613.25,
      },
    );

    const item = next.activePlayback!.playlist[0];
    expect(item.streamUrl).toBe(playback.playlist[0].audios![1].url);
    expect(item.voice).toBe("AnimeGo");
    expect(item.season).toBe(1);
    expect(item.episode).toBe(7);
    // Immutable replace: the source item and the rest of the queue are untouched.
    expect(playback.playlist[0].streamUrl).toContain("anilibria");
    expect(next.activePlayback!.playlist[1]).toBe(playback.playlist[1]);
    expect(next.activePlayback!.playlist).not.toBe(playback.playlist);
    expect(next.activePlayback).toMatchObject({
      startAt: 613.25,
      startAtZero: false,
      id: 345,
      instanceId: 41,
      playlistIndex: 0,
    });
    expect(next.playbackMeta).toBe(playbackMeta);
  });

  it("ignores a patch with a blank streamUrl instead of minting an empty-source item", () => {
    // Audio entries built without a resolved url carry "" / undefined — switching to one must keep
    // the current item intact, not re-init the pipeline onto an empty streamUrl.
    for (const streamUrl of ["", "   ", undefined as unknown as string]) {
      const next = switchPlaybackSourceState(
        { activePlayback: playback, playbackMeta: {} },
        { streamUrl, streamType: "m3u8", voice: "AnimeGo", startAt: 10 },
      );
      expect(next.activePlayback).toBe(playback);
    }
  });
});

describe("getPlaybackPipelineKey", () => {
  it("does not restart media for room chrome, queue, or metadata-only updates", () => {
    const baseKey = getPlaybackPipelineKey(playback);
    const descriptorOnlyUpdate: ActivePlayback = {
      ...playback,
      coWatch: true,
      playlist: [
        ...playback.playlist,
        { id: "1:9", season: 1, episode: 9, title: "9 серия", streamUrl: "https://streams.test/dororo/9.m3u8" },
      ],
      subtitles: [{ label: "English", src: "https://streams.test/dororo/en.vtt" }],
      duration: 9999,
    };

    expect(getPlaybackPipelineKey(descriptorOnlyUpdate)).toBe(baseKey);
  });

  it("restarts media when the current item's source changes", () => {
    const switched: ActivePlayback = {
      ...playback,
      playlist: [
        { ...playback.playlist[0], streamUrl: playback.playlist[0].audios![2].url },
        playback.playlist[1],
      ],
      startAt: 613.25,
      startAtZero: false,
    };

    expect(getPlaybackPipelineKey(switched)).not.toBe(getPlaybackPipelineKey(playback));
  });
});

describe("resolveExternalAudioIndex", () => {
  it("matches the actual selected provider URL before falling back to its query index", () => {
    const audios = playback.playlist[0].audios!;
    expect(resolveExternalAudioIndex(audios, audios[2].url)).toBe(2);
    expect(resolveExternalAudioIndex(audios, "https://proxy.test/watch.m3u8?audio=1")).toBe(1);
  });
});

describe("isSameBaseStreamUrl", () => {
  it("ignores the ?audio= selector and hash when comparing streams", () => {
    const current = "https://cdn.balancers.test/watch/serial-4898?token=abc&audio=0";
    expect(isSameBaseStreamUrl("https://cdn.balancers.test/watch/serial-4898?token=abc&audio=1", current)).toBe(true);
    expect(isSameBaseStreamUrl("https://cdn.balancers.test/watch/serial-4898?audio=2&token=abc", current)).toBe(true);
    expect(isSameBaseStreamUrl("https://cdn.balancers.test/watch/serial-4898?token=abc#t=10", current)).toBe(true);
  });

  it("detects genuinely different streams", () => {
    const current = "https://cdn.balancers.test/watch/serial-4898?audio=0";
    expect(isSameBaseStreamUrl("https://cdn.balancers.test/watch/serial-4898-dub2?audio=1", current)).toBe(false);
    expect(isSameBaseStreamUrl("https://other.test/watch/serial-4898?audio=1", current)).toBe(false);
    expect(isSameBaseStreamUrl("", current)).toBe(false);
  });
});

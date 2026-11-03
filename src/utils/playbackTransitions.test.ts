import { describe, expect, it } from "vitest";
import type { ActivePlayback, PlaybackMeta } from "../context/playbackTypes";
import {
  getPlaybackPipelineKey,
  switchPlaybackSourceState,
} from "./playbackTransitions";
import { resolveExternalAudioIndex, isSameBaseStreamUrl } from "./audioTrackOwnership";

const playback: ActivePlayback = {
  streamUrl: "https://streams.test/dororo/anilibria.m3u8?audio=0",
  streamType: "m3u8",
  title: "Дороро",
  mediaType: "tv",
  id: 345,
  season: 1,
  episode: 7,
  instanceId: 41,
  startAtZero: true,
  voice: "AniLibria",
  audios: [
    { name: "AniLibria", url: "https://streams.test/dororo/anilibria.m3u8?audio=0" },
    { name: "AnimeGo", url: "https://streams.test/dororo/animego.m3u8?audio=1" },
    { name: "AniLiberty", url: "https://streams.test/dororo/aniliberty.m3u8?audio=2" },
  ],
  playlist: [
    { title: "1 серия", streamUrl: "https://streams.test/dororo/1.m3u8" },
  ],
  subtitles: [{ label: "Русские", src: "https://streams.test/dororo/ru.vtt" }],
  duration: 1440,
};

describe("switchPlaybackSourceState", () => {
  it("changes only the external source and exact resume point", () => {
    const playbackMeta: PlaybackMeta = {
      subtitles: [{ label: "Русские", src: "https://streams.test/dororo/ru.vtt" }],
      duration: 1440,
    };

    const next = switchPlaybackSourceState(
      { activePlayback: playback, playbackMeta },
      {
        streamUrl: playback.audios![1].url,
        streamType: "m3u8",
        voice: "AnimeGo",
        startAt: 613.25,
      },
    );

    expect(next.activePlayback).toMatchObject({
      streamUrl: playback.audios![1].url,
      streamType: "m3u8",
      voice: "AnimeGo",
      startAt: 613.25,
      startAtZero: false,
      id: 345,
      season: 1,
      episode: 7,
      instanceId: 41,
    });
    expect(next.activePlayback?.audios).toBe(playback.audios);
    expect(next.activePlayback?.playlist).toBe(playback.playlist);
    expect(next.playbackMeta).toBe(playbackMeta);
    expect(playback.streamUrl).toContain("anilibria");
  });

  it("ignores a patch with a blank streamUrl instead of minting an empty-source descriptor", () => {
    // Audio entries built without a resolved url carry "" / undefined — switching to one must keep
    // the current descriptor intact, not re-init the pipeline onto an empty streamUrl.
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
      voice: "renamed voice",
      audios: [...(playback.audios ?? [])],
      playlist: [
        ...(playback.playlist ?? []),
        { title: "2 серия", streamUrl: "https://streams.test/dororo/2.m3u8" },
      ],
      subtitles: [{ label: "English", src: "https://streams.test/dororo/en.vtt" }],
      duration: 9999,
    };

    expect(getPlaybackPipelineKey(descriptorOnlyUpdate)).toBe(baseKey);
  });

  it("restarts media when the actual source changes", () => {
    const switched = {
      ...playback,
      streamUrl: playback.audios![2].url,
      startAt: 613.25,
      startAtZero: false,
    };

    expect(getPlaybackPipelineKey(switched)).not.toBe(getPlaybackPipelineKey(playback));
  });
});

describe("resolveExternalAudioIndex", () => {
  it("matches the actual selected provider URL before falling back to its query index", () => {
    expect(resolveExternalAudioIndex(playback.audios!, playback.audios![2].url)).toBe(2);
    expect(resolveExternalAudioIndex(playback.audios!, "https://proxy.test/watch.m3u8?audio=1")).toBe(1);
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

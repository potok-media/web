import { describe, expect, it } from "vitest";
import type { ActivePlayback, PlaybackMeta } from "../context/playbackTypes";
import {
  getPlaybackPipelineKey,
  switchPlaybackSourceState,
} from "./playbackTransitions";
import { resolveExternalAudioIndex } from "./audioTrackOwnership";

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

import { describe, expect, it } from "vitest";
import { getPlaybackResumePosition, inferStreamTypeFromUrl } from "./hlsPlaybackUtils";
import type { ActivePlayback } from "../../context/playbackTypes";

const base = { streamUrl: "x", title: "t", mediaType: "tv" as const, id: 1 };

describe("getPlaybackResumePosition", () => {
  it("prefers explicit startAt over stored resume", () => {
    const playback = { ...base, startAt: 77 } as ActivePlayback;
    expect(getPlaybackResumePosition(playback)).toBe(77);
  });

  it("returns 0 when startAtZero even if startAt is set", () => {
    const playback = { ...base, startAt: 77, startAtZero: true } as ActivePlayback;
    expect(getPlaybackResumePosition(playback)).toBe(0);
  });
});

describe("inferStreamTypeFromUrl", () => {
  it("recognizes proxied HLS URLs with query parameters", () => {
    expect(inferStreamTypeFromUrl("https://stream.test/token.m3u8?audio=2")).toBe("m3u8");
  });

  it("preserves the fallback when a URL has no known media extension", () => {
    expect(inferStreamTypeFromUrl("https://stream.test/token", "dash")).toBe("dash");
  });
});

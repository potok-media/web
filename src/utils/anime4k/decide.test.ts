import { describe, expect, it } from "vitest";
import { isNativeSubtitleTrackShowing, resolveUpscaleCeiling } from "./decide";

describe("resolveUpscaleCeiling", () => {
  it("disables when unsupported or off, regardless of anime detection", () => {
    expect(resolveUpscaleCeiling("auto", { supported: false, isAnime: true })).toBeNull();
    expect(resolveUpscaleCeiling("off", { supported: true, isAnime: true })).toBeNull();
    expect(resolveUpscaleCeiling("high", { supported: false, isAnime: true })).toBeNull();
  });

  it("auto enables only for anime-detected playbacks, at the high ceiling", () => {
    expect(resolveUpscaleCeiling("auto", { supported: true, isAnime: true })).toBe("high");
    expect(resolveUpscaleCeiling("auto", { supported: true, isAnime: false })).toBeNull();
  });

  it("a manual tier is the ceiling even for non-anime content", () => {
    expect(resolveUpscaleCeiling("medium", { supported: true, isAnime: false })).toBe("medium");
    expect(resolveUpscaleCeiling("light", { supported: true, isAnime: true })).toBe("light");
  });
});

describe("isNativeSubtitleTrackShowing", () => {
  it("treats non-ASS tracks as native (block the upscaler) and ASS as overlay-safe", () => {
    expect(isNativeSubtitleTrackShowing(undefined)).toBe(false);
    expect(isNativeSubtitleTrackShowing(null)).toBe(false);
    expect(isNativeSubtitleTrackShowing({ codec: "ass" })).toBe(false);
    expect(isNativeSubtitleTrackShowing({ codec: "ssa" })).toBe(false);
    expect(isNativeSubtitleTrackShowing({ codec: "srt" })).toBe(true);
    expect(isNativeSubtitleTrackShowing({})).toBe(true);
  });
});

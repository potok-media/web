import { describe, expect, it } from "vitest";
import { resolveEpisodeAnnotationBadge } from "./episodeAnnotationBadgeModel";
import type { ArmEpisodeFiller } from "../../network/ArmTypes";

function filler(
  overrides: Partial<ArmEpisodeFiller> = {},
): ArmEpisodeFiller {
  return {
    status: "filler",
    confidence: 0.9,
    disputed: false,
    ...overrides,
  };
}

describe("resolveEpisodeAnnotationBadge", () => {
  it("renders nothing without a filler verdict", () => {
    expect(resolveEpisodeAnnotationBadge(undefined)).toBeNull();
    expect(resolveEpisodeAnnotationBadge(null)).toBeNull();
  });

  it("renders nothing for canon", () => {
    expect(resolveEpisodeAnnotationBadge(filler({ status: "canon" }))).toBeNull();
  });

  it("maps filler to a warning-toned badge", () => {
    expect(resolveEpisodeAnnotationBadge(filler({ status: "filler" }))).toEqual({
      labelKey: "episode.annotationFiller",
      tone: "warning",
      confidencePercent: 90,
      disputed: false,
    });
  });

  it("maps mixed to a neutral-toned badge", () => {
    const badge = resolveEpisodeAnnotationBadge(filler({ status: "mixed" }));
    expect(badge?.labelKey).toBe("episode.annotationMixed");
    expect(badge?.tone).toBe("neutral");
  });

  it("maps recap to a neutral-toned badge", () => {
    const badge = resolveEpisodeAnnotationBadge(filler({ status: "recap" }));
    expect(badge?.labelKey).toBe("episode.annotationRecap");
    expect(badge?.tone).toBe("neutral");
  });

  it("clamps confidence into 0..100 percent", () => {
    expect(
      resolveEpisodeAnnotationBadge(filler({ confidence: 1.7 }))?.confidencePercent,
    ).toBe(100);
    expect(
      resolveEpisodeAnnotationBadge(filler({ confidence: -0.4 }))?.confidencePercent,
    ).toBe(0);
    expect(
      resolveEpisodeAnnotationBadge(filler({ confidence: 0.876 }))?.confidencePercent,
    ).toBe(88);
    expect(
      resolveEpisodeAnnotationBadge(filler({ confidence: null }))?.confidencePercent,
    ).toBe(0);
  });

  it("flags a disputed verdict", () => {
    expect(
      resolveEpisodeAnnotationBadge(filler({ disputed: true }))?.disputed,
    ).toBe(true);
    expect(
      resolveEpisodeAnnotationBadge(filler({ disputed: false }))?.disputed,
    ).toBe(false);
  });
});

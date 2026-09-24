import { describe, expect, it } from "vitest";
import { resolveEpisodeAnnotationBadge } from "./episodeAnnotationBadgeModel";
import type { ArmEpisodeAnnotationSummary } from "../../network/ArmTypes";

function annotation(
  overrides: Partial<ArmEpisodeAnnotationSummary> = {},
): ArmEpisodeAnnotationSummary {
  return {
    episodeId: "00000000-0000-0000-0000-000000000001",
    resolutionState: "resolved",
    relation: "filler",
    recommendation: "skip",
    confidence: 0.9,
    evidence: [],
    ...overrides,
  };
}

describe("resolveEpisodeAnnotationBadge", () => {
  it("renders nothing without an annotation", () => {
    expect(resolveEpisodeAnnotationBadge(undefined)).toBeNull();
    expect(resolveEpisodeAnnotationBadge(null)).toBeNull();
  });

  it("renders nothing for canon and unknown relations", () => {
    expect(resolveEpisodeAnnotationBadge(annotation({ relation: "canon" }))).toBeNull();
    expect(resolveEpisodeAnnotationBadge(annotation({ relation: "unknown" }))).toBeNull();
  });

  it("maps filler to a warning-toned badge", () => {
    expect(resolveEpisodeAnnotationBadge(annotation({ relation: "filler" }))).toEqual({
      labelKey: "episode.annotationFiller",
      tone: "warning",
      confidencePercent: 90,
      disputed: false,
    });
  });

  it("maps mixed to a neutral-toned badge", () => {
    const badge = resolveEpisodeAnnotationBadge(annotation({ relation: "mixed" }));
    expect(badge?.labelKey).toBe("episode.annotationMixed");
    expect(badge?.tone).toBe("neutral");
  });

  it("maps recap to a neutral-toned badge", () => {
    const badge = resolveEpisodeAnnotationBadge(annotation({ relation: "recap" }));
    expect(badge?.labelKey).toBe("episode.annotationRecap");
    expect(badge?.tone).toBe("neutral");
  });

  it("clamps confidence into 0..100 percent", () => {
    expect(
      resolveEpisodeAnnotationBadge(annotation({ confidence: 1.7 }))?.confidencePercent,
    ).toBe(100);
    expect(
      resolveEpisodeAnnotationBadge(annotation({ confidence: -0.4 }))?.confidencePercent,
    ).toBe(0);
    expect(
      resolveEpisodeAnnotationBadge(annotation({ confidence: 0.876 }))?.confidencePercent,
    ).toBe(88);
  });

  it("flags disputed resolution state", () => {
    expect(
      resolveEpisodeAnnotationBadge(annotation({ resolutionState: "disputed" }))?.disputed,
    ).toBe(true);
    expect(
      resolveEpisodeAnnotationBadge(annotation({ resolutionState: "resolved" }))?.disputed,
    ).toBe(false);
  });
});

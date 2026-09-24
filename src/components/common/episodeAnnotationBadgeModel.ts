import type { ArmEpisodeAnnotationSummary } from "../../network/ArmTypes";

export type EpisodeAnnotationBadgeTone = "warning" | "neutral";

export interface EpisodeAnnotationBadgeModel {
  /** i18n key inside the "media" namespace. */
  labelKey: string;
  /** filler → warning; mixed/recap → neutral attention. */
  tone: EpisodeAnnotationBadgeTone;
  /** Clamped to 0..100 for display. */
  confidencePercent: number;
  disputed: boolean;
}

/**
 * Maps an ARM episode annotation to badge presentation. Canon and unknown relations are
 * the default viewing path and render nothing; only relations the viewer should act on
 * (filler/mixed/recap) produce a badge.
 */
export function resolveEpisodeAnnotationBadge(
  annotation?: ArmEpisodeAnnotationSummary | null,
): EpisodeAnnotationBadgeModel | null {
  if (!annotation) return null;

  const base = {
    confidencePercent: Math.round(Math.max(0, Math.min(1, annotation.confidence)) * 100),
    disputed: annotation.resolutionState === "disputed",
  };

  switch (annotation.relation) {
    case "filler":
      return { ...base, labelKey: "episode.annotationFiller", tone: "warning" };
    case "mixed":
      return { ...base, labelKey: "episode.annotationMixed", tone: "neutral" };
    case "recap":
      return { ...base, labelKey: "episode.annotationRecap", tone: "neutral" };
    default:
      return null;
  }
}

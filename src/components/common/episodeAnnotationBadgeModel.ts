import type { ArmEpisodeFiller } from "../../network/ArmTypes";

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
 * Maps an ARM episode filler verdict to badge presentation. Canon is the default viewing path
 * and renders nothing; only statuses the viewer should act on (filler/mixed/recap) produce a badge.
 */
export function resolveEpisodeAnnotationBadge(
  filler?: ArmEpisodeFiller | null,
): EpisodeAnnotationBadgeModel | null {
  if (!filler) return null;

  const base = {
    confidencePercent: Math.round(Math.max(0, Math.min(1, filler.confidence ?? 0)) * 100),
    disputed: filler.disputed,
  };

  switch (filler.status) {
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

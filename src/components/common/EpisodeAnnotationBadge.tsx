import React from "react";
import { useTranslation } from "react-i18next";
import type { ArmEpisodeAnnotationSummary } from "../../network/ArmTypes";
import { resolveEpisodeAnnotationBadge } from "./episodeAnnotationBadgeModel";

interface EpisodeAnnotationBadgeProps {
  annotation?: ArmEpisodeAnnotationSummary | null;
  overlay?: boolean;
}

export const EpisodeAnnotationBadge: React.FC<EpisodeAnnotationBadgeProps> = ({
  annotation,
  overlay = false,
}) => {
  const { t } = useTranslation("media");
  const badge = resolveEpisodeAnnotationBadge(annotation);
  if (!badge) {
    return null;
  }

  const label = t(badge.labelKey);
  const title = badge.disputed
    ? t("episode.annotationDisputedTitle", { label, confidence: badge.confidencePercent })
    : t("episode.annotationTitle", { label, confidence: badge.confidencePercent });

  return (
    <span
      className={`episode-annotation-badge episode-annotation-badge--${badge.tone}${overlay ? " episode-annotation-badge--overlay" : ""}${badge.disputed ? " episode-annotation-badge--disputed" : ""}`}
      title={title}
    >
      {label}
    </span>
  );
};

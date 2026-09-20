import React from "react";
import { useTranslation } from "react-i18next";
import type { ArmEpisodeAnnotationSummary } from "../../network/ArmTypes";

interface EpisodeAnnotationBadgeProps {
  annotation?: ArmEpisodeAnnotationSummary | null;
  overlay?: boolean;
}

export const EpisodeAnnotationBadge: React.FC<EpisodeAnnotationBadgeProps> = ({
  annotation,
  overlay = false,
}) => {
  const { t } = useTranslation("media");
  if (!annotation || (annotation.relation !== "filler" && annotation.relation !== "mixed")) {
    return null;
  }

  const label = annotation.relation === "filler"
    ? t("episode.annotationFiller")
    : t("episode.annotationMixed");
  const confidence = Math.round(Math.max(0, Math.min(1, annotation.confidence)) * 100);
  const disputed = annotation.resolutionState === "disputed";
  const title = disputed
    ? t("episode.annotationDisputedTitle", { label, confidence })
    : t("episode.annotationTitle", { label, confidence });

  return (
    <span
      className={`episode-annotation-badge${overlay ? " episode-annotation-badge--overlay" : ""}${disputed ? " episode-annotation-badge--disputed" : ""}`}
      title={title}
    >
      {label}
    </span>
  );
};

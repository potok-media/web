import React from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui";
import { ProfileStatsChart } from "./ProfileStatsChart";
import type { ProfileSummaryState } from "../../hooks/useProfileSummary";

interface ProfileStatisticsSectionProps {
  state: ProfileSummaryState;
}

/**
 * The statistics block above the continue rail. While the summary loads a skeleton keeps the
 * page layout stable; a failed fetch renders an explicit error state with a retry action
 * (never a silent gap); guests never mount this section.
 */
export const ProfileStatisticsSection: React.FC<ProfileStatisticsSectionProps> = ({ state }) => {
  const { t } = useTranslation("profile");

  if (state.status === "loading") {
    return (
      <section
        className="profile-chart-panel profile-chart-panel--loading"
        aria-busy="true"
        aria-label={t("chart.loading")}
      >
        <div className="profile-chart-header profile-chart-header--skeleton">
          <span className="profile-skeleton profile-skeleton-title" />
          <span className="profile-skeleton profile-skeleton-subtitle" />
        </div>
        <div className="profile-chart-metrics">
          <span className="profile-skeleton profile-skeleton-chip" />
          <span className="profile-skeleton profile-skeleton-chip" />
          <span className="profile-skeleton profile-skeleton-chip" />
          <span className="profile-skeleton profile-skeleton-chip" />
        </div>
        <div className="profile-chart-body">
          <div className="profile-skeleton profile-skeleton-chart" />
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="profile-chart-panel profile-chart-panel--error">
        <div className="profile-chart-error">
          <AlertCircle size="1.5rem" className="profile-chart-error-icon" />
          <div className="profile-chart-error-text">
            <h2 className="profile-section-title">{t("chart.errorTitle")}</h2>
            <p className="profile-chart-error-message">{t("chart.errorMessage")}</p>
          </div>
          <Button variant="accent" className="profile-chart-retry" onClick={state.retry}>
            {t("chart.retry")}
          </Button>
        </div>
      </section>
    );
  }

  return state.summary ? <ProfileStatsChart summary={state.summary} /> : null;
};

export default ProfileStatisticsSection;

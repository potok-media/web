import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Flame } from "lucide-react";
import type { ProfileSummary } from "../../network/ApiTypes";
import { mapDailyToChartBars, sumDailyMinutes } from "../../utils/profileStats";
import { Button } from "../ui";
import { StatChips } from "./ProfileHero";

interface ProfileStatsChartProps {
  summary: ProfileSummary;
}

/**
 * Hand-rolled SVG bar chart of the summary's 30-day series. Hovering a bar surfaces the day's
 * minutes; the busiest day is painted in the app accent. The panel is collapsible.
 */
export const ProfileStatsChart: React.FC<ProfileStatsChartProps> = ({ summary }) => {
  const { t } = useTranslation("profile");
  const [expanded, setExpanded] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const bars = useMemo(() => mapDailyToChartBars(summary.daily), [summary.daily]);
  const total = useMemo(() => sumDailyMinutes(summary.daily), [summary.daily]);

  const viewWidth = 300;
  const viewHeight = 80;
  const barGap = 2;
  const barWidth = (viewWidth - barGap * (bars.length - 1)) / Math.max(1, bars.length);
  const active = activeIndex != null ? bars[activeIndex] : null;

  return (
    <section className="profile-chart-panel">
      <Button
        variant="ghost"
        className="profile-chart-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={t(expanded ? "chart.collapse" : "chart.expand")}
      >
        <h2 className="profile-section-title">{t("chart.title")}</h2>
        <span className="profile-chart-subtitle">
          {t("chart.subtitle")}
          {summary.streakDays > 0 && (
            <span className="profile-chart-streak">
              <Flame size="0.875rem" className="profile-chart-streak-icon" />
              {t("stats.streak", { count: summary.streakDays })}
            </span>
          )}
        </span>
        <ChevronDown size="1.25rem" className={`profile-chart-chevron${expanded ? " open" : ""}`} />
      </Button>
      <div className="profile-chart-metrics">
        <StatChips summary={summary} />
      </div>
      {expanded && (
        <div className="profile-chart-body">
          {bars.length > 0 && total > 0 ? (
            <div className="profile-chart-canvas">
              <svg
                viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                preserveAspectRatio="none"
                className="profile-chart-svg"
                role="img"
                aria-label={t("chart.title")}
              >
                {bars.map((bar, index) => {
                  const height = Math.max(bar.heightRatio * viewHeight, bar.minutes > 0 ? 2 : 1);
                  return (
                    <rect
                      key={bar.date || index}
                      x={index * (barWidth + barGap)}
                      y={viewHeight - height}
                      width={Math.max(1, barWidth)}
                      height={height}
                      rx={1}
                      className={`profile-chart-bar${bar.isMax ? " profile-chart-bar--max" : ""}${
                        activeIndex === index ? " profile-chart-bar--hover" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      <title>{`${bar.date}: ${t("chart.minutes", { count: bar.minutes })}`}</title>
                    </rect>
                  );
                })}
              </svg>
              {active && (
                <div
                  className="profile-chart-tooltip"
                  style={{ left: `${((activeIndex! + 0.5) / bars.length) * 100}%` }}
                >
                  {t("chart.minutes", { count: active.minutes })}
                </div>
              )}
            </div>
          ) : (
            <p className="profile-chart-empty">{t("chart.empty")}</p>
          )}
        </div>
      )}
    </section>
  );
};

export default ProfileStatsChart;

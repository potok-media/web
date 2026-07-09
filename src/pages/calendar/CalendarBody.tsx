import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, BookmarkCheck } from "lucide-react";
import type { MediaCard } from "../../network/ApiTypes";
import { Button } from "../../components/ui";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { CalendarListItem } from "./CalendarListItem";

interface CalendarGroup {
  title: string;
  items: MediaCard[];
}

interface CalendarBodyProps {
  isTraktConnected: boolean;
  loading: boolean;
  error: string | null;
  groupedGroups: CalendarGroup[];
  formatReleaseTime: (dateTimeStr?: string) => string;
  onRefetch: () => void;
}

export const CalendarBody: React.FC<CalendarBodyProps> = ({
  isTraktConnected,
  loading,
  error,
  groupedGroups,
  formatReleaseTime,
  onRefetch,
}) => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();

  return (
    <>
      {!isTraktConnected && (
        <div className="calendar-trakt-banner">
          <div className="calendar-trakt-banner-content">
            <BookmarkCheck size="1.25rem" className="calendar-trakt-banner-icon" />
            <div className="calendar-trakt-banner-text-col">
              <span className="calendar-trakt-banner-title">{t("calendar.traktBannerTitle")}</span>
              <span className="calendar-trakt-banner-desc">
                {t("calendar.traktBannerDesc")}
              </span>
            </div>
          </div>
          <Button
            variant="accent"
            className="calendar-trakt-banner-btn"
            onClick={() => navigate("/profile")}
            aria-label={t("calendar.connectTraktAria")}
          >
            {t("calendar.connectTrakt")}
          </Button>
        </div>
      )}

      {error && (
        <div className="calendar-empty calendar-empty--error" role="alert">
          <AlertCircle size="2.5rem" className="calendar-time-icon calendar-error-icon" />
          <div>
            <h2 className="calendar-error-title">
              {t("calendar.errorTitle")}
            </h2>
            <p className="calendar-error-message">{error}</p>
          </div>
          <Button
            variant="accent"
            className="calendar-trakt-banner-btn calendar-retry-btn"
            onClick={onRefetch}
          >
            <RefreshCw size="0.875rem" />
            {t("calendar.retry")}
          </Button>
        </div>
      )}

      {loading && <CalendarSkeleton />}

      {!loading && !error && (
        <div className="calendar-list">
          {groupedGroups.map((group) => (
            <section key={group.title} className="calendar-group-section" aria-labelledby={`group-title-${group.title}`}>
              <h2 id={`group-title-${group.title}`} className="calendar-group-title">
                {group.title}
              </h2>
              <div className="calendar-group-rows">
                {group.items.map((item) => (
                  <CalendarListItem
                    key={`${item.id}-${item.nextEpisodeSeason ?? 0}-${item.nextEpisodeNumber ?? 0}-${item.airDateTime ?? ""}`}
                    item={item}
                    formatReleaseTime={formatReleaseTime}
                  />
                ))}
              </div>
            </section>
          ))}

          {groupedGroups.length === 0 && (
            <div className="calendar-empty" role="status">
              {t("calendar.emptyPeriod")}
            </div>
          )}
        </div>
      )}
    </>
  );
};
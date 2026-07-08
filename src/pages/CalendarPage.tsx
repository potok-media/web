import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Clock, AlertCircle, RefreshCw, BookmarkCheck, Star } from "lucide-react";
import { useCalendarData } from "../hooks/useCalendarData";
import type { MediaCard } from "../network/ApiTypes";
import { FilmOff } from "../components/common/FilmOff";
import { Focusable, FocusableButton } from "../components/common/TVNavigation";
import "../styles/media.css";

const CalendarSkeleton: React.FC = () => (
  <div className="calendar-list" aria-hidden="true">
    {[1, 2, 3].map((i) => (
      <div key={i} className="calendar-skeleton-row">
        <div className="calendar-skeleton-poster skeleton-pulse" />
        <div className="calendar-skeleton-info">
          <div className="calendar-skeleton-title skeleton-pulse" />
          <div className="calendar-skeleton-sub skeleton-pulse" />
          <div className="calendar-skeleton-desc skeleton-pulse" />
        </div>
        <div className="calendar-skeleton-time skeleton-pulse" />
      </div>
    ))}
  </div>
);

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();

  const { t } = useTranslation("media");
  const { items, loading, error, refetch, isTraktConnected } = useCalendarData();
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "tomorrow" | "this-week">("all");


  const filterChips = [
    { key: "all", label: t("calendar.filters.all") },
    { key: "today", label: t("calendar.filters.today") },
    { key: "tomorrow", label: t("calendar.filters.tomorrow") },
    { key: "this-week", label: t("calendar.filters.thisWeek") }
  ] as const;

  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return items.filter((item) => {
      if (!item.airDateTime) {
        return activeFilter === "all";
      }
      const airDate = new Date(item.airDateTime);
      airDate.setHours(0, 0, 0, 0);

      if (activeFilter === "today") {
        return airDate.getTime() === today.getTime();
      }
      if (activeFilter === "tomorrow") {
        return airDate.getTime() === tomorrow.getTime();
      }
      if (activeFilter === "this-week") {
        return airDate.getTime() >= today.getTime() && airDate.getTime() <= endOfWeek.getTime();
      }
      return true; // "all"
    });
  }, [items, activeFilter]);

  // Group items by release date for clean presentation
  const groupedGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups: Record<string, MediaCard[]> = {};

    filteredItems.forEach((item) => {
      let groupTitle = t("calendar.groups.tbd");
      if (item.airDateTime) {
        const date = new Date(item.airDateTime);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
          groupTitle = t("calendar.groups.today");
        } else if (date.getTime() === tomorrow.getTime()) {
          groupTitle = t("calendar.groups.tomorrow");
        } else {
          // Localized date: e.g. "Среда, 3 июня"
          groupTitle = date.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long"
          });
          // Capitalize first letter
          groupTitle = groupTitle.charAt(0).toUpperCase() + groupTitle.slice(1);
        }
      }

      if (!groups[groupTitle]) {
        groups[groupTitle] = [];
      }
      groups[groupTitle].push(item);
    });

    return Object.entries(groups).map(([title, items]) => ({
      title,
      items
    }));
  }, [filteredItems]);

  const formatReleaseTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return t("calendar.soon");
    try {
      const date = new Date(dateTimeStr);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return t("calendar.soon");
    }
  };

  const calendarHeader = (
    <>
      <header className="calendar-header">
        <h1 className="calendar-title">{t("calendar.title")}</h1>
        <p className="calendar-description">
          {isTraktConnected ? t("calendar.descriptionConnected") : t("calendar.descriptionGuest")}
        </p>
      </header>

      {/* Filter Chips (Material Design 3 style) */}
      <nav className="tabs-header calendar-tabs" aria-label={t("calendar.filtersAriaLabel")}>
        {filterChips.map((chip, index) => (
          <FocusableButton
            key={chip.key}
            focusKey={index === 0 ? "CALENDAR_FIRST_TAB" : undefined}
            className={`tab-btn ${activeFilter === chip.key ? "active" : ""}`}
            onClick={() => setActiveFilter(chip.key)}
            aria-current={activeFilter === chip.key ? "page" : undefined}
          >
            {chip.label}
          </FocusableButton>
        ))}
      </nav>
    </>
  );

  const calendarBody = (
    <>
      {/* Trakt connection prompt for guest users */}
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
          <FocusableButton
            className="calendar-trakt-banner-btn"
            onClick={() => navigate("/profile")}
            aria-label={t("calendar.connectTraktAria")}
          >
            {t("calendar.connectTrakt")}
          </FocusableButton>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="calendar-empty" role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <AlertCircle size="2.5rem" className="calendar-time-icon" style={{ color: "var(--error)" }} />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {t("calendar.errorTitle")}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>{error}</p>
          </div>
          <FocusableButton
            className="calendar-trakt-banner-btn"
            onClick={refetch}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}
          >
            <RefreshCw size="0.875rem" />
            {t("calendar.retry")}
          </FocusableButton>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && <CalendarSkeleton />}

      {/* Chronological release feed */}
      {!loading && !error && (
        <div className="calendar-list">
          {groupedGroups.map((group) => (
            <section key={group.title} className="calendar-group-section" aria-labelledby={`group-title-${group.title}`}>
              <h2 id={`group-title-${group.title}`} className="calendar-group-title">
                {group.title}
              </h2>
              <div className="calendar-group-rows">
                {group.items.map((item) => {
                  const rating = item.kpRating || item.tmdbRating || item.imdbRating;
                  return (
                    <Focusable
                      key={`${item.id}-${item.nextEpisodeSeason ?? 0}-${item.nextEpisodeNumber ?? 0}-${item.airDateTime ?? ''}`}
                      focusKey={`CAL_ROW_${item.id}-${item.nextEpisodeSeason ?? 0}-${item.nextEpisodeNumber ?? 0}`}
                      onEnterPress={() => {
                        navigate(`/media/tv/${item.id}`);
                      }}
                    >
                      {({ ref: focusRef, focused }) => (
                        <Link
                          ref={focusRef}
                          to={`/media/tv/${item.id}`}
                          className={`calendar-row ${focused ? "focused" : ""}`}
                          aria-label={`${item.title}. ${item.nextEpisodeSeason && item.nextEpisodeNumber ? t("calendar.seasonEpisode", { season: item.nextEpisodeSeason, episode: item.nextEpisodeNumber }) : t("calendar.newEpisode")}. ${t("calendar.releaseDateAria", { time: formatReleaseTime(item.airDateTime) })}`}
                        >
                          {/* Fixed sized poster wrap with aspect-ratio to prevent layout shift */}
                          <div className="calendar-poster-wrap">
                            {item.posterSrc ? (
                              <>
                                <img
                                  src={item.posterSrc}
                                  alt={item.title}
                                  className="calendar-poster-img"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const placeholder = e.currentTarget.nextElementSibling;
                                    if (placeholder) {
                                      (placeholder as HTMLElement).style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="media-poster-fallback-placeholder" style={{ display: 'none', height: '100%', width: '100%' }}>
                                  <FilmOff size="1.5rem" />
                                </div>
                              </>
                            ) : (
                              <div className="media-poster-fallback-placeholder" style={{ height: '100%', width: '100%' }}>
                                <FilmOff size="1.5rem" />
                              </div>
                            )}
                          </div>

                          {/* Episode detailing */}
                          <div className="calendar-info-col">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                              <span className="calendar-show-title">{item.title}</span>
                              {rating && (
                                <span className="media-glass-pill rating-pill" style={{ display: "inline-flex", alignItems: "center", gap: "0.1875rem", padding: "0.125rem 0.375rem", height: "auto", fontSize: "0.75rem" }}>
                                  <Star size="0.625rem" fill="var(--warning)" stroke="var(--warning)" />
                                  <span>{rating.toFixed(1)}</span>
                                </span>
                              )}
                            </div>
                            <span className="calendar-episode-title">
                              {item.nextEpisodeSeason && item.nextEpisodeNumber
                                ? t("calendar.seasonEpisode", { season: item.nextEpisodeSeason, episode: item.nextEpisodeNumber })
                                : t("calendar.newEpisode")}
                              {item.nextEpisodeTitle ? ` — «${item.nextEpisodeTitle}»` : ""}
                            </span>
                            {item.overview && (
                              <p className="calendar-episode-overview">
                                {item.overview}
                              </p>
                            )}
                          </div>

                          {/* Localized release time tag */}
                          <div className="calendar-time-tag">
                            <Clock size="0.875rem" className="calendar-time-icon" />
                            <span>{formatReleaseTime(item.airDateTime)}</span>
                          </div>
                        </Link>
                      )}
                    </Focusable>
                  );
                })}
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



  return (
    <main className="calendar-container">
      {calendarHeader}
      {calendarBody}
    </main>
  );
};

export default CalendarPage;

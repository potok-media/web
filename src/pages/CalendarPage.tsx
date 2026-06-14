import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, AlertCircle, RefreshCw, BookmarkCheck, Star } from "lucide-react";
import { useCalendarData } from "../hooks/useCalendarData";
import type { MediaCard } from "../network/ApiTypes";
import { FilmOff } from "../components/common/FilmOff";
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
  const { items, loading, error, refetch, isTraktConnected } = useCalendarData();
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "tomorrow" | "this-week">("all");

  const filterChips = [
    { key: "all", label: "Все релизы" },
    { key: "today", label: "Сегодня" },
    { key: "tomorrow", label: "Завтра" },
    { key: "this-week", label: "На этой неделе" }
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
      let groupTitle = "Даты уточняются";
      if (item.airDateTime) {
        const date = new Date(item.airDateTime);
        date.setHours(0, 0, 0, 0);

        if (date.getTime() === today.getTime()) {
          groupTitle = "Сегодня";
        } else if (date.getTime() === tomorrow.getTime()) {
          groupTitle = "Завтра";
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
    if (!dateTimeStr) return "Скоро";
    try {
      const date = new Date(dateTimeStr);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } catch {
      return "Скоро";
    }
  };

  return (
    <main className="calendar-container">
      <header className="calendar-header">
        <h1 className="calendar-title">Календарь релизов</h1>
        <p className="calendar-description">
          Расписание выхода новых серий {isTraktConnected ? "ваших сериалов из" : "популярных сериалов на основе данных"} Trakt.tv.
        </p>
      </header>

      {/* Trakt connection prompt for guest users */}
      {!isTraktConnected && (
        <div className="calendar-trakt-banner">
          <div className="calendar-trakt-banner-content">
            <BookmarkCheck size={20} className="calendar-trakt-banner-icon" />
            <div className="calendar-trakt-banner-text-col">
              <span className="calendar-trakt-banner-title">Синхронизируйте личное расписание</span>
              <span className="calendar-trakt-banner-desc">
                Подключите ваш аккаунт Trakt.tv в профиле, чтобы видеть точное расписание серий только для сериалов из ваших закладок и истории.
              </span>
            </div>
          </div>
          <button 
            className="calendar-trakt-banner-btn"
            onClick={() => navigate("/profile")}
            aria-label="Перейти в профиль для подключения Trakt.tv"
          >
            Подключить Trakt.tv
          </button>
        </div>
      )}

      {/* Filter Chips (Material Design 3 style) */}
      <nav className="tabs-header calendar-tabs" aria-label="Фильтры календаря по дням">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            className={`tab-btn ${activeFilter === chip.key ? "active" : ""}`}
            onClick={() => setActiveFilter(chip.key)}
            aria-current={activeFilter === chip.key ? "page" : undefined}
          >
            {chip.label}
          </button>
        ))}
      </nav>

      {/* Error state */}
      {error && (
        <div className="calendar-empty" role="alert" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <AlertCircle size={40} className="calendar-time-icon" style={{ color: "var(--error)" }} />
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              Ошибка загрузки расписания
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>{error}</p>
          </div>
          <button 
            className="calendar-trakt-banner-btn" 
            onClick={refetch}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "8px" }}
          >
            <RefreshCw size={14} />
            Повторить попытку
          </button>
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
                    <Link
                      key={`${item.id}-${item.nextEpisodeSeason ?? 0}-${item.nextEpisodeNumber ?? 0}-${item.airDateTime ?? ''}`}
                      to={`/media/tv/${item.id}`}
                      className="calendar-row"
                      aria-label={`${item.title}. ${item.nextEpisodeSeason && item.nextEpisodeNumber ? `Сезон ${item.nextEpisodeSeason}, Серия ${item.nextEpisodeNumber}` : "Новая серия"}. Дата выхода: ${formatReleaseTime(item.airDateTime)}.`}
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
                              <FilmOff size={24} />
                            </div>
                          </>
                        ) : (
                          <div className="media-poster-fallback-placeholder" style={{ height: '100%', width: '100%' }}>
                            <FilmOff size={24} />
                          </div>
                        )}
                      </div>

                      {/* Episode detailing */}
                      <div className="calendar-info-col">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="calendar-show-title">{item.title}</span>
                          {rating && (
                            <span className="media-glass-pill rating-pill" style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", height: "auto", fontSize: "0.75rem" }}>
                              <Star size={10} fill="var(--warning)" stroke="var(--warning)" />
                              <span>{rating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <span className="calendar-episode-title">
                          {item.nextEpisodeSeason && item.nextEpisodeNumber
                            ? `Сезон ${item.nextEpisodeSeason}, Серия ${item.nextEpisodeNumber}`
                            : "Новая серия"}
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
                        <Clock size={14} className="calendar-time-icon" />
                        <span>{formatReleaseTime(item.airDateTime)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {groupedGroups.length === 0 && (
            <div className="calendar-empty" role="status">
              Нет запланированных релизов на выбранный период.
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default CalendarPage;

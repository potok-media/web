import React from "react";
import { Link } from "react-router-dom";
import { Clock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MediaCard } from "../../network/ApiTypes";
import { FilmOff } from "../../components/common/FilmOff";

interface CalendarListItemProps {
  item: MediaCard;
  formatReleaseTime: (dateTimeStr?: string) => string;
}

export const CalendarListItem: React.FC<CalendarListItemProps> = ({
  item,
  formatReleaseTime,
}) => {
  const { t } = useTranslation("media");
  const rating = item.kpRating || item.tmdbRating || item.imdbRating;

  return (
    <Link
      to={`/media/tv/${item.id}`}
      className="calendar-row"
      aria-label={`${item.title}. ${item.nextEpisodeSeason && item.nextEpisodeNumber ? t("calendar.seasonEpisode", { season: item.nextEpisodeSeason, episode: item.nextEpisodeNumber }) : t("calendar.newEpisode")}. ${t("calendar.releaseDateAria", { time: formatReleaseTime(item.airDateTime) })}`}
    >
      <div className="calendar-poster-wrap">
        {item.posterSrc ? (
          <>
            <img
              src={item.posterSrc}
              alt={item.title}
              className="calendar-poster-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.classList.add("u-hidden");
                const placeholder = e.currentTarget.nextElementSibling;
                if (placeholder) {
                  placeholder.classList.remove("is-hidden");
                }
              }}
            />
            <div className="media-poster-fallback-placeholder fill is-hidden">
              <FilmOff size="1.5rem" />
            </div>
          </>
        ) : (
          <div className="media-poster-fallback-placeholder fill">
            <FilmOff size="1.5rem" />
          </div>
        )}
      </div>

      <div className="calendar-info-col">
        <div className="calendar-title-row">
          <span className="calendar-show-title">{item.title}</span>
          {rating && (
            <span className="media-glass-pill rating-pill calendar-rating-pill">
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

      <div className="calendar-time-tag">
        <Clock size="0.875rem" className="calendar-time-icon" />
        <span>{formatReleaseTime(item.airDateTime)}</span>
      </div>
    </Link>
  );
};
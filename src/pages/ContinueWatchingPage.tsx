import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { Play } from "lucide-react";
import { useAuth } from "../context/AppSettingsContext";
import { useContinueWatchingCards } from "../hooks/useContinueWatchingCards";
import { useContinueWatchingEpisodes } from "../hooks/profile/useContinueWatchingEpisodes";
import { useResumeContinueEpisode } from "../hooks/profile/useResumeContinueEpisode";
import { ContinueEpisodeCard } from "../components/profile/ContinueEpisodeCard";
import { FilmOff } from "../components/common/FilmOff";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { ContinueWatchingEpisodeItem } from "../network/ApiTypes";
import {
  groupContinueEpisodes,
  continueActivityDay,
  remainingMinutes,
  type ContinueEpisodeGroup,
} from "../utils/continueGroups";
import { formatTimecode } from "../utils/continueWatching";
import { formatLocalizedDate } from "../utils/formatDate";
import { mediaCardLink } from "../utils/mediaLink";
import { resizeTmdbImage } from "../utils/mediaUtils";
// Card + section-title/divider styles live in the profile stylesheet (rail-side scoping) —
// the page reuses those classes, so the stylesheet must be loaded here too.
import "../styles/profile.css";

/**
 * /library/continue — compact episode groups ("Variant 3"). Data source is exactly what the
 * profile rail consumes (useContinueWatchingEpisodes over /api/library/continue-watching/episodes),
 * so page and rail can never disagree on counts; the title-level continue endpoint is only
 * joined for titleMeta.totalEpisodes (the «N из M» total the episode rows don't carry).
 * Groups preserve the endpoint's ordering: title groups by last activity DESC, episodes
 * ascending within a title.
 */

const ContinueFilmCard: React.FC<{
  item: ContinueWatchingEpisodeItem;
  onClick: (item: ContinueWatchingEpisodeItem) => void;
}> = ({ item, onClick }) => {
  const { t } = useTranslation("media");
  const stillUrl = resizeTmdbImage(item.backdropSrc || item.posterSrc, "w780");

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onClick(item);
    }
  };

  return (
    <RouterLink
      to={mediaCardLink({ id: item.id, mediaType: item.mediaType })}
      className="continue-film-card"
      onClick={handleClick}
    >
      <div className="continue-film-card-still-wrap">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={item.title}
            className="continue-film-card-still"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="continue-episode-card-still-fallback">
            <FilmOff size="2rem" />
          </div>
        )}
        <div className="continue-film-card-overlay">
          <span className="continue-film-card-title">{item.title}</span>
          <span className="continue-film-card-resume">
            · {t("library.continuePage.resumeFrom", { time: formatTimecode(item.progressSeconds) })}
          </span>
        </div>
        {item.progressPercent > 0 && (
          <div className="media-card-progress-container">
            <div
              className="media-card-progress-bar"
              style={{ "--progress-width": `${item.progressPercent}%` } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    </RouterLink>
  );
};

const ContinueGroupSection: React.FC<{
  group: ContinueEpisodeGroup;
  totalEpisodes?: number;
  onResume: (item: ContinueWatchingEpisodeItem) => void;
}> = ({ group, totalEpisodes, onResume }) => {
  const { t, i18n } = useTranslation("media");

  const meta = useMemo(() => {
    const activity = continueActivityDay(
      group.lastActivityAt ? new Date(group.lastActivityAt).toISOString() : undefined,
    );
    const activityLabel =
      activity.kind === "today"
        ? t("library.continuePage.today")
        : activity.kind === "yesterday"
          ? t("library.continuePage.yesterday")
          : activity.date
            ? formatLocalizedDate(activity.date, { day: "numeric", month: "short" }, i18n.language)
            : "";
    if (group.isFilm) {
      const film = group.episodes[0];
      const left = film ? remainingMinutes(film.progressSeconds, film.durationSeconds) : 0;
      const parts = [`${t("library.continuePage.remainingMinutes", { count: left })}`];
      if (activityLabel) parts.push(activityLabel);
      return parts.join(" · ");
    }
    const count =
      typeof totalEpisodes === "number" && totalEpisodes > 0
        ? t("library.continuePage.episodesCount", {
            count: group.episodes.length,
            total: totalEpisodes,
          })
        : t("library.continuePage.episodesCountShort", { count: group.episodes.length });
    return activityLabel ? `${count} · ${activityLabel}` : count;
  }, [group, totalEpisodes, t, i18n.language]);

  return (
    <section className="continue-group">
      <header className="continue-group-header">
        {group.posterSrc && (
          <img
            className="continue-group-poster"
            src={resizeTmdbImage(group.posterSrc, "w92")}
            alt=""
            loading="lazy"
            decoding="async"
          />
        )}
        <h3 className="continue-group-heading">
          <RouterLink
            to={mediaCardLink({ id: group.id, mediaType: group.mediaType })}
            className="continue-group-title"
          >
            {group.title}
          </RouterLink>
          {meta && <span className="continue-group-meta">· {meta}</span>}
        </h3>
      </header>
      {group.isFilm ? (
        <ContinueFilmCard item={group.episodes[0]} onClick={onResume} />
      ) : (
        <div className="continue-groups-flow">
          {group.episodes.map((item) => (
            <ContinueEpisodeCard
              key={`${item.id}:${item.seasonNumber ?? "movie"}:${item.episodeNumber ?? 0}`}
              item={item}
              onClick={onResume}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export const ContinueWatchingPage: React.FC = () => {
  const { t } = useTranslation("media");
  const { potokToken } = useAuth();
  const isAuth = Boolean(potokToken);
  const { items, loading } = useContinueWatchingEpisodes(isAuth);
  const { cards } = useContinueWatchingCards(isAuth);
  const resumeEpisode = useResumeContinueEpisode();

  const totalEpisodesById = useMemo(() => {
    const map = new Map<number, number>();
    for (const card of cards) {
      const total = card.titleMeta?.totalEpisodes;
      if (typeof total === "number" && total > 0) map.set(card.id, total);
    }
    return map;
  }, [cards]);

  const groups = useMemo(() => groupContinueEpisodes(items), [items]);

  return (
    <div className="library-page-container library-page-container--collection continue-page-container">
      <main className="continue-page">
        <h2 className="profile-section-title">{t("home.continueWatching")}</h2>
        {loading && groups.length === 0 ? (
          <LoadingSpinner height="40vh" message={t("library.loadingCollection")} />
        ) : groups.length === 0 ? (
          <div className="library-empty-view collection-mode">
            <Play size="3rem" className="library-empty-icon muted" />
            <h2 className="library-empty-title">{t("library.continuePage.emptyTitle")}</h2>
            <p className="library-empty-subtitle">{t("library.continuePage.emptySub")}</p>
          </div>
        ) : (
          groups.map((group, index) => (
            <React.Fragment key={group.key}>
              {index > 0 && <hr className="profile-section-divider" />}
              <ContinueGroupSection
                group={group}
                totalEpisodes={totalEpisodesById.get(group.id)}
                onResume={resumeEpisode}
              />
            </React.Fragment>
          ))
        )}
      </main>
    </div>
  );
};

export default ContinueWatchingPage;

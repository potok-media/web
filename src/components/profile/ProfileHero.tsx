import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Clock, Film, Play } from "lucide-react";
import type { MediaCard, ProfileSummary } from "../../network/ApiTypes";
import { Button } from "../ui";
import { mediaCardLink } from "../../utils/mediaLink";
import { formatLocalizedDate } from "../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../utils/language";
import { splitHoursMinutes } from "../../utils/profileStats";
import { formatTimecode } from "../../utils/continueWatching";
import { useEpisodeTitle } from "../../hooks/profile/useEpisodeTitle";

interface ProfileHeroProps {
  username: string;
  isAuth: boolean;
  createdAt?: string;
  nowWatching?: MediaCard | null;
  onResume: (card: MediaCard) => void;
  onLogin?: () => void;
}

/** Global watch-stat chips. Lives in the STATISTICS panel — the hero banner stays clean
 * (owner decision: don't spend hero space on stats). */
export function StatChips({ summary }: { summary: ProfileSummary }) {
  const { t } = useTranslation("profile");
  const { hours, minutes } = splitHoursMinutes(summary.totalWatchMinutes);
  const timeLabel = hours > 0
    ? t("stats.hoursMinutes", { hours, minutes })
    : t("stats.minutesOnly", { minutes });
  const chips = [
    { icon: Clock, label: timeLabel, title: t("stats.time") },
    { icon: Play, label: t("stats.episodes", { count: summary.episodesWatched }), title: t("stats.episodesLabel") },
    { icon: Check, label: t("stats.titles", { count: summary.titlesCompleted }), title: t("stats.titlesLabel") },
    ...(summary.topGenre?.name
      ? [{ icon: Film, label: t("stats.genre", { name: summary.topGenre.name }), title: t("stats.genreLabel") }]
      : []),
  ];
  return (
    <div className="profile-stat-chips">
      {chips.map((chip, index) => (
        <span key={index} className="profile-stat-chip" title={chip.title}>
          <chip.icon size="0.875rem" className="profile-stat-chip-icon" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function NowWatching({
  card,
  onResume,
}: {
  card: MediaCard;
  onResume: (card: MediaCard) => void;
}) {
  const { t } = useTranslation("profile");
  const resume = card.resume;
  const progressSeconds = Number(resume?.progressSeconds) || 0;
  const durationSeconds = Number(resume?.durationSeconds) || 0;
  const episode = resume?.episode;
  const season = resume?.season;
  const episodeName = useEpisodeTitle(
    card.mediaType === "movie" ? undefined : Number(card.id),
    episode != null ? Number(season ?? 1) : undefined,
    episode != null ? Number(episode) : undefined,
  );
  const timecode = durationSeconds > 0
    ? `${formatTimecode(progressSeconds)} / ${formatTimecode(durationSeconds)}`
    : "";
  // «Серия N. Название серии. nn:mm/zz:uu» — missing segments drop out cleanly.
  const metaLine = [
    episode != null ? t("hero.episode", { number: episode }) : null,
    episodeName || null,
    timecode || null,
  ].filter(Boolean).join(". ");

  return (
    <div className="profile-hero-now">
      <div className="profile-hero-now-label">{t("hero.nowWatching")}</div>
      <h2 className="profile-hero-now-title">{card.title}</h2>
      {metaLine && <div className="profile-hero-now-meta">{metaLine}</div>}
      <div className="profile-hero-now-actions">
        <Button variant="accent" className="profile-hero-resume-btn" onClick={() => onResume(card)}>
          <Play size="1rem" />
          {t("hero.continue")}
        </Button>
        <Link to={mediaCardLink(card)} className="ui-btn ui-btn--glass profile-hero-title-btn">
          {t("hero.toDetails")}
        </Link>
      </div>
    </div>
  );
}

/** Identity block + "Сейчас смотрите" — the top of the new profile page. Stat chips live in
 * the statistics panel, not here (the banner stays clean). */
export const ProfileHero: React.FC<ProfileHeroProps> = ({
  username,
  isAuth,
  createdAt,
  nowWatching,
  onResume,
  onLogin,
}) => {
  const { t } = useTranslation("profile");
  const memberSince = isAuth && createdAt
    ? formatLocalizedDate(createdAt, { day: "numeric", month: "long", year: "numeric" }, toIntlLocale(getActiveLanguage()))
    : null;
  const backdrop = nowWatching?.backdropSrc;

  return (
    <section className={`profile-hero${backdrop ? " profile-hero--with-backdrop" : ""}`}>
      {backdrop && (
        <img className="profile-hero-backdrop" src={backdrop} alt="" aria-hidden="true" />
      )}
      <div className="profile-hero-content">
        <div className="profile-hero-identity">
          <div className="profile-avatar profile-hero-avatar">
            {username.substring(0, 1).toUpperCase()}
          </div>
          <div className="profile-hero-id-text">
            <div className="profile-hero-username">{username}</div>
            {memberSince && (
              <div className="profile-hero-member-since">{t("hero.memberSince", { date: memberSince })}</div>
            )}
          </div>
          {!isAuth && onLogin && (
            <Button variant="accent" className="profile-hero-login-btn" onClick={onLogin}>
              {t("hero.login")}
            </Button>
          )}
        </div>
        {nowWatching && <NowWatching card={nowWatching} onResume={onResume} />}
      </div>
    </section>
  );
};

export default ProfileHero;

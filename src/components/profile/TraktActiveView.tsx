import React from "react";
import { useTranslation } from "react-i18next";
import { User, Film, Tv, Clock, Award } from "lucide-react";
import { FocusableButton } from "../common/TVNavigation";

interface TraktActiveViewProps {
  traktProfile: {
    avatarUrl?: string;
    name?: string;
    username: string;
    isVip?: boolean;
    moviesWatched: number;
    episodesWatched: number;
    totalWatchMinutes: number;
    ratingsCount: number;
  };
  onLogout: () => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; color: string; title: string; value: string }> = ({
  icon,
  color,
  title,
  value,
}) => (
  <div className="profile-stat-card">
    <div
      className="profile-stat-icon-wrapper"
      style={{
        backgroundColor: `${color}15`,
        color,
      }}
    >
      {icon}
    </div>
    <div className="profile-stat-info">
      <span className="profile-stat-title">{title}</span>
      <span className="profile-stat-value">{value}</span>
    </div>
  </div>
);

export const TraktActiveView: React.FC<TraktActiveViewProps> = ({ traktProfile, onLogout }) => {
  const { t } = useTranslation("profile");
  const formatMinutes = (minutes: number) => {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return days > 0
      ? t("traktActive.watchTime.daysHours", { days, hours })
      : t("traktActive.watchTime.hours", { hours });
  };

  return (
    <div className="strategy-card-wrapper">
      <div className="profile-user-card-trakt">
        <div className="profile-user-details">
          {traktProfile.avatarUrl ? (
            <img
              src={traktProfile.avatarUrl}
              alt="Avatar"
              className="profile-avatar-trakt"
            />
          ) : (
            <div className="profile-avatar-trakt-placeholder">
              <User size={24} className="profile-empty-avatar-icon" />
            </div>
          )}
          <div>
            <div className="profile-user-name-wrapper">
              <h3 className="profile-user-name-title">
                {traktProfile.name || traktProfile.username}
              </h3>
              {traktProfile.isVip && (
                <span className="profile-vip-badge">VIP</span>
              )}
            </div>
            <p className="profile-connection-status">
              <span className="profile-connection-dot" />
              <span className="profile-connection-text">{t("traktActive.connected")}</span>
              <span>• @{traktProfile.username}</span>
            </p>
          </div>
        </div>
        <FocusableButton
          onClick={onLogout}
          className="trakt-logout-btn"
        >
          {t("traktActive.disconnect")}
        </FocusableButton>
      </div>

      <div className="profile-stats-grid">
        <StatCard
          icon={<Film size={20} />}
          color="var(--accent)"
          title={t("traktActive.stats.moviesWatched")}
          value={traktProfile.moviesWatched.toString()}
        />
        <StatCard
          icon={<Tv size={20} />}
          color="var(--accent)"
          title={t("traktActive.stats.episodesWatched")}
          value={traktProfile.episodesWatched.toString()}
        />
        <StatCard
          icon={<Clock size={20} />}
          color="#10b981"
          title={t("traktActive.stats.watchTime")}
          value={formatMinutes(traktProfile.totalWatchMinutes)}
        />
        <StatCard
          icon={<Award size={20} />}
          color="#fbbf24"
          title={t("traktActive.stats.ratingsGiven")}
          value={traktProfile.ratingsCount.toString()}
        />
      </div>
    </div>
  );
};

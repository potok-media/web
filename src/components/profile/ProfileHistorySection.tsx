import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { SyncApiClient, type UserHistoryEntry } from "../../network/SyncApiClient";
import { LoadingSpinner } from "../LoadingSpinner";
import { formatLocalizedDate } from "../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../utils/language";

/**
 * Phase 2 history: a plain chronological list straight from the sync history endpoint. Phase 3
 * replaces this with the real activity feed (the backend for it doesn't exist yet), so rows are
 * deliberately simple — media kind, episode coordinates when present, and the watch date.
 */
export const ProfileHistorySection: React.FC = () => {
  const { t } = useTranslation("profile");
  const [entries, setEntries] = useState<UserHistoryEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const history = await SyncApiClient.fetchSyncHistory();
        if (!cancelled) {
          setEntries(
            [...history].sort((a, b) =>
              (b.lastWatchedAt ?? "").localeCompare(a.lastWatchedAt ?? ""),
            ),
          );
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="library-empty-view collection-mode">
        <History size="3rem" className="library-empty-icon muted" />
        <h2 className="library-empty-title">{t("page.historySection.loadError")}</h2>
      </div>
    );
  }

  if (!entries) {
    return <LoadingSpinner height="40vh" />;
  }

  if (entries.length === 0) {
    return (
      <div className="library-empty-view collection-mode">
        <History size="3rem" className="library-empty-icon muted" />
        <h2 className="library-empty-title">{t("page.historySection.empty")}</h2>
        <p className="library-empty-subtitle">{t("page.historySection.emptySub")}</p>
      </div>
    );
  }

  return (
    <div className="profile-history-list">
      {entries.map((entry, index) => (
        <div key={`${entry.tmdbId ?? "x"}-${entry.mediaType}-${index}`} className="profile-history-row">
          <div className="profile-history-row-main">
            <span className="profile-history-kind">
              {entry.mediaType === "tv"
                ? t("page.historySection.episodeLine", {
                    season: entry.seasonNumber ?? "?",
                    episode: entry.episodeNumber ?? "?",
                  })
                : t("page.historySection.movieLine")}
            </span>
            {entry.tmdbId && <span className="profile-history-meta">TMDB {entry.tmdbId}</span>}
          </div>
          {entry.lastWatchedAt && (
            <span className="profile-history-date">
              {formatLocalizedDate(
                entry.lastWatchedAt,
                { day: "numeric", month: "long", year: "numeric" },
                toIntlLocale(getActiveLanguage()),
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProfileHistorySection;

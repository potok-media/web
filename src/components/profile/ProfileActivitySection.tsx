import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, History, Play } from "lucide-react";
import { SyncApiClient } from "../../network/SyncApiClient";
import type { ProfileActivityItem } from "../../network/ApiTypes";
import { groupProfileActivity, formatActivityTime } from "../../utils/profileActivity";
import { formatLocalizedDate } from "../../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../../utils/language";

const PREVIEW_LIMIT = 8;
const PREVIEW_ROWS = 6;

/**
 * Compact «Активность» sidebar preview (approved mockup): the newest watch events from
 * /api/profile/activity — one small page (a single day, capped at PREVIEW_LIMIT) — as short
 * «day/time · «Title» · Серия N» rows, with «Вся история →» linking to the full history page.
 * Same data and row vocabulary as the timeline below, collapsed to a preview. Auth-only —
 * ProfilePage renders the sidebar for authenticated users only. A failed fetch renders a
 * muted error line, never a silent gap.
 */
export const ProfileActivitySection: React.FC = () => {
  const { t } = useTranslation("profile");
  const [items, setItems] = useState<ProfileActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const page = await SyncApiClient.fetchProfileActivity(null, 1, PREVIEW_LIMIT);
        if (cancelled) return;
        setItems(page.items);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const groups = groupProfileActivity(items).slice(0, 3);
    const locale = toIntlLocale(getActiveLanguage());
    return groups.flatMap((group) => {
      const dayLabel =
        group.kind === "today"
          ? null
          : group.kind === "yesterday"
            ? t("page.historySection.yesterday")
            : formatLocalizedDate(group.date, { day: "numeric", month: "short" }, locale);
      return group.items.map((item) => ({
        item,
        label: group.kind === "today" ? formatActivityTime(item.occurredAt) : dayLabel,
      }));
    });
  }, [items, t]);

  return (
    <section className="profile-activity-section">
      <h2 className="profile-sidebar-title">{t("activity.title")}</h2>
      {!loaded && (
        <div className="profile-activity-skeleton" aria-busy="true">
          <span className="profile-skeleton profile-skeleton-activity-row" />
          <span className="profile-skeleton profile-skeleton-activity-row" />
          <span className="profile-skeleton profile-skeleton-activity-row" />
        </div>
      )}
      {loaded && failed && (
        <p className="profile-activity-error">{t("activity.loadError")}</p>
      )}
      {loaded && !failed && items.length === 0 && (
        <div className="profile-activity-empty">
          <History size="1.5rem" className="library-empty-icon muted" />
          <p className="profile-activity-empty-text">{t("activity.empty")}</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className="profile-activity-rows">
          {rows.slice(0, PREVIEW_ROWS).map(({ item, label }, index) => (
            <div
              key={`${item.occurredAt}-${item.title.tmdbId}-${item.episodeNumber ?? "movie"}-${index}`}
              className="profile-activity-row"
            >
              <span className="profile-activity-day">{label}</span>
              {item.isCompleted ? (
                <Check size="1rem" className="profile-history-mark profile-history-mark--done" aria-hidden />
              ) : (
                <Play size="0.8rem" className="profile-history-mark profile-history-mark--progress" aria-hidden />
              )}
              <span className="profile-activity-main">
                <b>{item.title.name ?? item.title.tmdbId}</b>
                <span className="profile-activity-meta">
                  {" · "}
                  {item.mediaType === "movie"
                    ? t("page.historySection.filmLine")
                    : t("page.historySection.seriesLine", { episode: item.episodeNumber ?? "?" })}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      <Link to="/library/history" className="profile-activity-more">
        {t("activity.allHistory")}
      </Link>
    </section>
  );
};

export default ProfileActivitySection;

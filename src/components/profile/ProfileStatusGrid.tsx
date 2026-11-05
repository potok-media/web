import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { Grid } from "../common/Grid";
import { LoadingSpinner } from "../LoadingSpinner";
import { MediaCardComponent } from "../MediaCardComponent";
import { Button } from "../ui";
import type { ContinueWatchingEpisodeItem, MediaCard } from "../../network/ApiTypes";
import { mediaCardLink } from "../../utils/mediaLink";
import { formatTimecode } from "../../utils/continueWatching";
import type { TitleStatus } from "../../utils/userData";

interface ProfileStatusGridProps {
  status: TitleStatus;
  items: MediaCard[];
  loading: boolean;
  /** Episode-level continue rows — the only real per-title progress source; matched by tmdb id. */
  continueEpisodes: ContinueWatchingEpisodeItem[];
}

/**
 * A status tab's content: the standard media cards (same component as the home page) in the
 * shared library grid at a reduced tile size. Titles with a matching continue-watching row get
 * the card's continue overlay (progress bar + episode pill) and a subtitle meta line from that
 * row's real watch progress; everything else shows the year. Long lists render the first batch
 * with an inline «show more» — the tab never becomes an endless wall of posters.
 */
const PAGE_SIZE = 12;

export const ProfileStatusGrid: React.FC<ProfileStatusGridProps> = ({
  status,
  items,
  loading,
  continueEpisodes,
}) => {
  const { t } = useTranslation("profile");
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const continueById = React.useMemo(() => {
    const map = new Map<string, ContinueWatchingEpisodeItem>();
    for (const episode of continueEpisodes) {
      map.set(`${episode.mediaType}:${episode.id}`, episode);
    }
    return map;
  }, [continueEpisodes]);

  if (loading && items.length === 0) {
    return <LoadingSpinner height="30vh" />;
  }

  if (items.length === 0) {
    return (
      <div className="library-empty-view collection-mode">
        <Bookmark size="3rem" className="library-empty-icon muted" />
        <h2 className="library-empty-title">{t(`page.sections.${status}.empty`)}</h2>
        <p className="library-empty-subtitle">{t(`page.sections.${status}.emptySub`)}</p>
      </div>
    );
  }

  const visible = items.slice(0, visibleCount);
  const hiddenCount = items.length - visible.length;

  return (
    <>
      <Grid className="library-grid profile-status-cards" minWidth="8rem" gap="var(--space-m)">
        {visible.map((item) => {
          const cont = continueById.get(`${item.mediaType}:${item.id}`);
          const subtitle = cont
            ? item.mediaType === "movie"
              ? cont.durationSeconds > 0
                ? t("statusGrid.remainingMovie", {
                    time: formatTimecode(Math.max(0, cont.durationSeconds - cont.progressSeconds)),
                  })
                : item.year
                  ? String(item.year)
                  : ""
              : t("statusGrid.episodeLine", { number: cont.episodeNumber ?? "?" })
            : item.year
              ? String(item.year)
              : "";
          const card: MediaCard = cont
            ? {
                ...item,
                subtitle,
                progress: {
                  aired: 1,
                  completed: 0,
                  percentage: cont.progressPercent,
                  lastSeason: cont.seasonNumber ?? undefined,
                  lastEpisode: cont.episodeNumber ?? undefined,
                },
              }
            : { ...item, subtitle };
          return (
            <MediaCardComponent
              key={`${item.mediaType}:${item.id}`}
              item={card}
              onClick={() => navigate(mediaCardLink(item))}
              showContinueOverlay={Boolean(cont)}
            />
          );
        })}
      </Grid>
      {hiddenCount > 0 && (
        <Button
          variant="ghost"
          className="profile-status-more"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          {t("statusGrid.showMore", { count: hiddenCount })}
        </Button>
      )}
    </>
  );
};

export default ProfileStatusGrid;

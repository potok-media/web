import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FilmOff } from "../common/FilmOff";
import type { ContinueWatchingEpisodeItem } from "../../network/ApiTypes";
import { useSeasonEpisodes, buildSeasonStillMap } from "../../hooks/profile/useSeasonEpisodes";
import { ApiClient } from "../../network/ApiClient";
import { mediaCardLink } from "../../utils/mediaLink";
import { resizeTmdbImage } from "../../utils/mediaUtils";

interface ContinueEpisodeCardProps {
  item: ContinueWatchingEpisodeItem;
  onClick: (item: ContinueWatchingEpisodeItem) => void;
}

/**
 * Episode-level continue-watching card (the profile rail): the episode still from the shared
 * per-(show, season) hook, a "Серия N" pill, the episode name, the owning title in small type
 * and the watch-progress bar. Movies render as a single entry — backdrop still, no episode
 * chrome. A plain click resumes the episode through its own resume payload; the link href
 * keeps middle-click/ctrl-click on the title page.
 */
export const ContinueEpisodeCard: React.FC<ContinueEpisodeCardProps> = React.memo(({ item, onClick }) => {
  const { t: tPlayer } = useTranslation("player");
  const isTv = item.mediaType === "tv" && item.seasonNumber != null && item.episodeNumber != null;
  const seasonEpisodes = useSeasonEpisodes(
    isTv ? item.id : undefined,
    isTv ? item.seasonNumber ?? undefined : undefined,
  );
  const stills = useMemo(
    () => buildSeasonStillMap(seasonEpisodes, ApiClient.baseURL),
    [seasonEpisodes],
  );

  const episodeName = useMemo(() => {
    if (!isTv) return "";
    const match = seasonEpisodes.find((ep) => Number(ep.episodeNumber) === item.episodeNumber);
    return match?.name || "";
  }, [isTv, seasonEpisodes, item.episodeNumber]);

  const stillUrl = isTv
    ? resizeTmdbImage(stills.get(`${item.seasonNumber}:${item.episodeNumber}`), "w500")
    : resizeTmdbImage(item.backdropSrc || item.posterSrc, "w780");
  const episodeLabel = tPlayer("controls.episodeNumbered", { number: item.episodeNumber });

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onClick(item);
    }
  };

  return (
    <RouterLink
      to={mediaCardLink({ id: item.id, mediaType: item.mediaType })}
      className="continue-episode-card"
      onClick={handleClick}
    >
      <div className="continue-episode-card-still-wrap">
        {stillUrl ? (
          <img
            src={stillUrl}
            alt={isTv ? episodeName || episodeLabel : item.title}
            className="continue-episode-card-still"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="continue-episode-card-still-fallback">
            <FilmOff size="2rem" />
          </div>
        )}
        {isTv && <span className="media-glass-pill continue-episode-card-pill">{episodeLabel}</span>}
        {item.progressPercent > 0 && (
          <div className="media-card-progress-container">
            <div
              className="media-card-progress-bar"
              style={{ "--progress-width": `${item.progressPercent}%` } as React.CSSProperties}
            />
          </div>
        )}
      </div>
      <div className="continue-episode-card-info">
        {isTv ? (
          <span className="continue-episode-card-episode">
            {episodeName || episodeLabel}
          </span>
        ) : (
          <span className="continue-episode-card-episode">{item.title}</span>
        )}
        {isTv && <span className="continue-episode-card-title">{item.title}</span>}
      </div>
    </RouterLink>
  );
});

ContinueEpisodeCard.displayName = "ContinueEpisodeCard";
export default ContinueEpisodeCard;

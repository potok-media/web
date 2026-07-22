import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Check, ArrowLeft } from "lucide-react";
import { Overlay } from "./common/Overlay";
import { Button, IconButton } from "./ui";
import { FilmOff } from "./common/FilmOff";
import type { TvEpisode } from "../network/ApiTypes";
import { formatLocalizedDate } from "../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../utils/language";

interface EpisodesListPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  seasonNumber: number;
  episodes: TvEpisode[];
  isEpisodeWatched: (episodeNumber: number) => boolean;
}

/**
 * View-only browser for a season's episodes. Used when a season has many episodes and the
 * horizontal carousel becomes unwieldy: shows every episode as a row with still, title,
 * air date, overview and watched state. No playback — mirrors the file selector layout
 * without its play button, since episodes on the details page are selected, not launched here.
 */
export const EpisodesListPopup: React.FC<EpisodesListPopupProps> = ({
  isOpen,
  onClose,
  title,
  seasonNumber,
  episodes,
  isEpisodeWatched,
}) => {
  const { t } = useTranslation("media");

  const watchedCount = useMemo(
    () => episodes.filter((ep) => isEpisodeWatched(ep.episodeNumber)).length,
    [episodes, isEpisodeWatched],
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return formatLocalizedDate(
        dateStr,
        { day: "numeric", month: "long", year: "numeric" },
        toIntlLocale(getActiveLanguage()),
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      styled={false}
      backdropClassName="modal-overlay"
      className="modal-container modal-container-files"
    >
      <div className="modal-header">
        <div className="modal-title-row">
          <IconButton className="modal-close-btn" onClick={onClose} aria-label={t("selector.close")}>
            <ArrowLeft size="1.25rem" />
          </IconButton>
          <div className="modal-title-text-group">
            <h3 className="modal-title modal-title-custom-size">{title}</h3>
            <span className="modal-subtitle modal-subtitle-text">
              {t("seasons.season", { number: seasonNumber })}
            </span>
            {episodes.length > 0 && (
              <div className="tv-progress-container">
                <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
                <span>
                  {t("selector.progress", {
                    completed: watchedCount,
                    total: episodes.length,
                    percentage: Math.round((watchedCount / episodes.length) * 100),
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-header-actions-row">
          <Button variant="ghost" className="close-btn" onClick={onClose}>
            {t("selector.close")}
          </Button>
        </div>
      </div>

      <div className="episode-popup-body episode-popup-body-flex">
        <div className="files-list-container episode-files-list">
          <div className="episode-popup-rows-list episode-popup-rows-scroll">
            {episodes.map((ep) => {
              const watched = isEpisodeWatched(ep.episodeNumber);
              const still = ep.stillPath || ep.still_path;
              const subtitle = formatDate(ep.airDate);
              return (
                <div key={ep.id} className="file-card-row file-card-row--static">
                  <div className="file-card-banner">
                    {still ? (
                      <img src={still} alt={ep.name} className="file-card-image" loading="lazy" />
                    ) : (
                      <div className="file-card-preview-placeholder file-card-preview-placeholder--icon">
                        <FilmOff size="2rem" />
                      </div>
                    )}
                    <div className="file-card-banner-overlay" />
                    {ep.episodeNumber > 0 && (
                      <span className="file-card-bg-number">{ep.episodeNumber}</span>
                    )}
                    {watched && (
                      <div className="file-card-badge-checked">
                        <CheckCircle2 size="1.25rem" fill="var(--accent)" stroke="var(--bg-surface)" />
                      </div>
                    )}
                  </div>

                  <div className="file-card-info-panel">
                    <h4 className="file-card-title">
                      {ep.episodeNumber > 0 ? `${ep.episodeNumber}. ` : ""}
                      {ep.name}
                    </h4>
                    {subtitle && <span className="file-card-subtitle">{subtitle}</span>}
                    {ep.overview && <p className="episode-popup-overview">{ep.overview}</p>}
                  </div>

                  {watched && (
                    <div className="file-card-details-panel">
                      <div className="file-card-watched-badge">
                        <Check size="0.75rem" strokeWidth={3} />
                        <span>{t("selector.watched")}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Overlay>
  );
};

export default EpisodesListPopup;

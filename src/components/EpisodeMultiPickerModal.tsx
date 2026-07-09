import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, CheckCircle2, Loader2 } from "lucide-react";
import { Overlay } from "./common/Overlay";
import { FilmOff } from "./common/FilmOff";
import { Button, Chip, IconButton, Pressable } from "./ui";
import type { TvEpisode } from "../network/ApiTypes";
import { logger } from "../utils/logger";
import { formatLocalizedDate } from "../utils/formatDate";
import { getActiveLanguage, toIntlLocale } from "../utils/language";
import { useEpisodePickerData } from "../hooks/useEpisodePickerData";

const formatPickerDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const formatted = formatLocalizedDate(
    dateStr,
    { day: "numeric", month: "long", year: "numeric" },
    toIntlLocale(getActiveLanguage()),
  );
  return formatted || dateStr;
};

interface PickerCardProps {
  episode: TvEpisode;
  seasonNumber: number;
  isWatched: boolean;
  disabled: boolean;
  onToggle: (season: number, number: number) => void;
}

const PickerCard = React.memo<PickerCardProps>(({ episode, seasonNumber, isWatched, disabled, onToggle }) => (
  <Pressable
    className={`episode-picker-card ${isWatched ? "checked" : ""}`}
    disabled={disabled}
    onPress={() => onToggle(seasonNumber, episode.episodeNumber)}
    role="button"
  >
    <div className={`episode-card-preview-wrap${isWatched ? " is-watched" : ""}`}>
      {episode.stillPath ? (
        <img src={episode.stillPath} alt={episode.name} className="episode-card-image" loading="lazy" decoding="async" />
      ) : (
        <div className="episode-still-fallback-placeholder">
          <FilmOff size="1.75rem" />
        </div>
      )}
      <span className="episode-card-badge">{episode.episodeNumber}</span>
      <div className={`episode-picker-check ${isWatched ? "checked" : ""}`}>
        {isWatched && <Check size="0.75rem" strokeWidth={3.5} />}
      </div>
    </div>
    <div className="episode-card-info">
      <span className="episode-card-title">{episode.name}</span>
      {episode.airDate && <span className="episode-card-date">{formatPickerDate(episode.airDate)}</span>}
    </div>
  </Pressable>
));
PickerCard.displayName = "PickerCard";

interface EpisodeMultiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: number;
  mediaTitle: string;
  numberOfSeasons: number;
  initialSelected: { season: number; number: number }[];
  onSave: (selected: { season: number; number: number }[]) => Promise<void>;
}

export const EpisodeMultiPickerModal: React.FC<EpisodeMultiPickerModalProps> = ({
  isOpen,
  onClose,
  mediaId,
  mediaTitle,
  numberOfSeasons,
  initialSelected,
  onSave,
}) => {
  const { t } = useTranslation("media");
  const [saving, setSaving] = useState(false);

  const {
    loading,
    selected,
    selectedSeason,
    setSelectedSeason,
    uniqueSeasons,
    currentSeasonEpisodes,
    selectedKeys,
    totalEpisodes,
    toggleEpisode,
    toggleCurrentSeason,
    isCurrentSeasonFull,
    selectAll,
    deselectAll,
    formatSelectedRanges,
  } = useEpisodePickerData({ isOpen, mediaId, numberOfSeasons, initialSelected });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } catch (err) {
      logger.error("Failed to save episode selection", err);
    } finally {
      setSaving(false);
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
          <IconButton className="modal-close-btn" onClick={onClose} aria-label={t("multiPicker.close")}>
            <X size="1.25rem" />
          </IconButton>
          <div className="modal-title-text-group">
            <h3 className="modal-title modal-title-custom-size">{t("multiPicker.title")}</h3>
            <span className="modal-subtitle modal-subtitle-text">{mediaTitle}</span>
            {totalEpisodes > 0 && (
              <div className="tv-progress-container">
                <CheckCircle2 size="0.75rem" fill="var(--accent)" stroke="var(--bg-surface)" />
                <span>{t("multiPicker.selectedCount", { count: selected.length, total: totalEpisodes })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-header-actions-row">
          <Button variant="ghost" className="close-btn" onClick={selectAll} disabled={loading || saving}>{t("multiPicker.selectAll")}</Button>
          <Button variant="ghost" className="close-btn" onClick={deselectAll} disabled={loading || saving}>{t("multiPicker.deselectAll")}</Button>
        </div>
      </div>

      <div className="episode-popup-body episode-popup-body-flex">
        {loading ? (
          <div className="picker-loading-container">
            <Loader2 className="multipicker-spinner" size="2.5rem" />
            <span className="picker-loading-label">{t("multiPicker.loading")}</span>
          </div>
        ) : (
          <div className="files-list-container files-list-container--column">
            {uniqueSeasons.length > 1 && (
              <div className="multipicker-season-tabs">
                {uniqueSeasons.map((sNum) => (
                  <Chip
                    key={sNum}
                    active={selectedSeason === sNum}
                    className={`potok-badge ${selectedSeason === sNum ? "potok-badge-info" : "potok-badge-secondary"}`}
                    onClick={() => setSelectedSeason(sNum)}
                  >
                    {t("multiPicker.season", { number: sNum })}
                  </Chip>
                ))}
                <Button
                  variant="ghost"
                  className="close-btn multipicker-season-toggle"
                  onClick={toggleCurrentSeason}
                  disabled={saving}
                >
                  {isCurrentSeasonFull ? t("multiPicker.deselectSeason") : t("multiPicker.selectSeason")}
                </Button>
              </div>
            )}

            <div className="episode-popup-rows-list episode-popup-rows-list--scroll">
              <div className="episode-grid">
                {currentSeasonEpisodes.map((ep) => (
                  <PickerCard
                    key={ep.id}
                    episode={ep}
                    seasonNumber={selectedSeason}
                    isWatched={selectedKeys.has(`${selectedSeason}_${ep.episodeNumber}`)}
                    disabled={saving}
                    onToggle={toggleEpisode}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {saving && (
          <div className="saving-overlay">
            <div className="saving-content">
              <div className="premium-spinner picker-loading-spinner-wrap">
                <div className="spinner-outer" />
                <div className="spinner-inner" />
              </div>
              <span>{t("multiPicker.saving")}</span>
            </div>
          </div>
        )}
      </div>

      <div className="multipicker-footer">
        <span className="multipicker-footer-summary">
          {selected.length > 0 ? t("multiPicker.selectedRanges", { ranges: formatSelectedRanges(selected) }) : t("multiPicker.nothingSelected")}
        </span>
        <div className="multipicker-footer-actions">
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t("multiPicker.cancel")}</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading || saving}>
            {saving ? t("multiPicker.saving") : t("multiPicker.save")}
          </Button>
        </div>
      </div>
    </Overlay>
  );
};

export default EpisodeMultiPickerModal;
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Check, CheckCircle2, Loader2 } from "lucide-react";
import { Overlay } from "./common/Overlay";
import { FilmOff } from "./common/FilmOff";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import { logger } from "../utils/logger";
import { resizeTmdbImage } from "../utils/mediaUtils";

// Desktop-only modal (disabled on TV, where a single season-toggle button is used).
const STILL_SIZE = "w500";

const formatPickerDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) + " г.";
  } catch {
    return dateStr;
  }
};

interface PickerCardProps {
  episode: TvEpisode;
  seasonNumber: number;
  isWatched: boolean;
  disabled: boolean;
  onToggle: (season: number, number: number) => void;
}

// Memoized so toggling one episode re-renders only that card, not the whole grid.
const PickerCard = React.memo<PickerCardProps>(({ episode, seasonNumber, isWatched, disabled, onToggle }) => (
  <button
    type="button"
    className={`episode-picker-card ${isWatched ? "checked" : ""}`}
    onClick={() => !disabled && onToggle(seasonNumber, episode.episodeNumber)}
  >
    <div className="episode-card-preview-wrap" style={{ borderColor: isWatched ? "var(--accent)" : undefined }}>
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
  </button>
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
  const [loading, setLoading] = useState(true);
  const [seasonsData, setSeasonsData] = useState<{ seasonNumber: number; episodes: TvEpisode[] }[]>([]);
  const [selected, setSelected] = useState<{ season: number; number: number }[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    setSelected(initialSelected);
    setLoading(true);
    setSaving(false);

    const loadAllSeasons = async () => {
      try {
        const promises = Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map(async (sNum) => {
          try {
            const data = await ApiClient.fetchTvSeason(mediaId, sNum);
            const mapped: TvEpisode[] = (data.episodes || []).map((ep: any) => ({
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              name: ep.name,
              overview: ep.overview,
              stillPath: resizeTmdbImage(ep.stillPath || ep.still_path, STILL_SIZE),
              airDate: ep.airDate,
              seasonNumber: sNum,
            }));
            return { seasonNumber: sNum, episodes: mapped };
          } catch {
            return { seasonNumber: sNum, episodes: [] };
          }
        });

        const results = await Promise.all(promises);
        setSeasonsData(results.sort((a, b) => a.seasonNumber - b.seasonNumber));
      } catch (err) {
        logger.error("Failed to load seasons for multipicker", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllSeasons();
  }, [isOpen, mediaId, numberOfSeasons, initialSelected]);

  const uniqueSeasons = useMemo(
    () => seasonsData.filter((s) => s.episodes.length > 0).map((s) => s.seasonNumber),
    [seasonsData]
  );

  // Keep the selected season tab valid once data loads.
  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [uniqueSeasons, selectedSeason]);

  const currentSeasonEpisodes = useMemo(
    () => seasonsData.find((s) => s.seasonNumber === selectedSeason)?.episodes ?? [],
    [seasonsData, selectedSeason]
  );

  // O(1) lookup so each card gets a stable boolean.
  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => `${item.season}_${item.number}`)),
    [selected]
  );

  const totalEpisodes = useMemo(
    () => seasonsData.reduce((sum, s) => sum + s.episodes.length, 0),
    [seasonsData]
  );

  const toggleEpisode = useCallback((season: number, number: number) => {
    setSelected((prev) => {
      const exists = prev.some((item) => item.season === season && item.number === number);
      return exists
        ? prev.filter((item) => !(item.season === season && item.number === number))
        : [...prev, { season, number }];
    });
  }, []);

  const isCurrentSeasonFull =
    currentSeasonEpisodes.length > 0 &&
    currentSeasonEpisodes.every((ep) => selectedKeys.has(`${selectedSeason}_${ep.episodeNumber}`));

  const toggleCurrentSeason = useCallback(() => {
    setSelected((prev) => {
      const filtered = prev.filter((item) => item.season !== selectedSeason);
      if (isCurrentSeasonFull) return filtered;
      return [...filtered, ...currentSeasonEpisodes.map((ep) => ({ season: selectedSeason, number: ep.episodeNumber }))];
    });
  }, [selectedSeason, currentSeasonEpisodes, isCurrentSeasonFull]);

  const selectAll = useCallback(() => {
    setSelected(seasonsData.flatMap((s) => s.episodes.map((ep) => ({ season: s.seasonNumber, number: ep.episodeNumber }))));
  }, [seasonsData]);

  const deselectAll = useCallback(() => setSelected([]), []);

  // "S1: 1-8, 10; S2: 3-5" — compact ranges of the current selection.
  const formatSelectedRanges = useCallback((list: { season: number; number: number }[]): string => {
    if (list.length === 0) return "";
    const grouped: Record<number, number[]> = {};
    for (const item of list) {
      (grouped[item.season] ??= []).push(item.number);
    }
    const parts: string[] = [];
    for (const s of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
      const nums = grouped[s].sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = nums[0];
      let prev = nums[0];
      for (let i = 1; i <= nums.length; i++) {
        const cur = nums[i];
        if (cur === prev + 1) {
          prev = cur;
        } else {
          ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
          start = cur;
          prev = cur;
        }
      }
      parts.push(`S${s}: ${ranges.join(", ")}`);
    }
    return parts.join("; ");
  }, []);

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
      focusKey="MULTIPICKER_MODAL"
      styled={false}
      backdropClassName="modal-overlay"
      className="modal-container"
      style={{ maxWidth: "53.125rem", display: "flex", flexDirection: "column" }}
    >
        {/* Header — same layout as the torrent EpisodeSelectorPopup, with marking actions. */}
        <div className="modal-header">
          <div className="modal-title-row">
            <button className="modal-close-btn" onClick={onClose} aria-label={t("multiPicker.close")}>
              <X size="1.25rem" />
            </button>
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
            <button className="close-btn" onClick={selectAll} disabled={loading || saving}>{t("multiPicker.selectAll")}</button>
            <button className="close-btn" onClick={deselectAll} disabled={loading || saving}>{t("multiPicker.deselectAll")}</button>
          </div>
        </div>

        <div className="episode-popup-body" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {loading ? (
            <div className="picker-loading-container">
              <Loader2 className="multipicker-spinner" size="2.5rem" style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
              <span className="picker-loading-label">{t("multiPicker.loading")}</span>
            </div>
          ) : (
            <div className="files-list-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {uniqueSeasons.length > 1 && (
                <div className="multipicker-season-tabs" style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflowX: "auto", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  {uniqueSeasons.map((sNum) => (
                    <button
                      key={sNum}
                      className={`potok-badge ${selectedSeason === sNum ? "potok-badge-info" : "potok-badge-secondary"}`}
                      style={{ cursor: "pointer", border: "none", padding: "0.5rem 1.125rem", borderRadius: "1.25rem", fontSize: "0.85rem" }}
                      onClick={() => setSelectedSeason(sNum)}
                    >
                      {t("multiPicker.season", { number: sNum })}
                    </button>
                  ))}
                  <button
                    className="close-btn"
                    style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                    onClick={toggleCurrentSeason}
                    disabled={saving}
                  >
                    {isCurrentSeasonFull ? t("multiPicker.deselectSeason") : t("multiPicker.selectSeason")}
                  </button>
                </div>
              )}

              <div className="episode-popup-rows-list" style={{ padding: "1.25rem", flex: 1, overflowY: "auto" }}>
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
                <div className="premium-spinner" style={{ marginBottom: "0.75rem" }}>
                  <div className="spinner-outer" />
                  <div className="spinner-inner" />
                </div>
                <span>{t("multiPicker.saving")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: selection summary + primary actions */}
        <div
          className="multipicker-footer"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1rem 1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", lineHeight: 1.3, wordBreak: "break-word" }}>
            {selected.length > 0 ? t("multiPicker.selectedRanges", { ranges: formatSelectedRanges(selected) }) : t("multiPicker.nothingSelected")}
          </span>
          <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
            <button className="potok-btn potok-btn-secondary" onClick={onClose} disabled={saving}>{t("multiPicker.cancel")}</button>
            <button className="potok-btn potok-btn-primary" onClick={handleSave} disabled={loading || saving}>
              {saving ? t("multiPicker.saving") : t("multiPicker.save")}
            </button>
          </div>
        </div>
    </Overlay>
  );
};

export default EpisodeMultiPickerModal;

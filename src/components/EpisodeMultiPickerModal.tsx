import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { X, Check, Loader2 } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { FocusableButton, FocusableContainer, setNativeScrollMode } from "./common/TVNavigation";
import { logger } from "../utils/logger";
import { resizeTmdbImage } from "../utils/mediaUtils";
import { PlatformManager } from "../utils/PlatformManager";

const IS_TV = PlatformManager.isTV();
// Smaller stills on TV — this modal renders every episode of every season at once.
const STILL_SIZE = IS_TV ? "w300" : "w500";

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
  focusKey: string;
  onToggle: (season: number, number: number) => void;
}

// Memoized so toggling one episode re-renders only that card, not the whole grid
// (which can be hundreds of cards across all seasons).
const PickerCard = React.memo<PickerCardProps>(({ episode, seasonNumber, isWatched, disabled, focusKey, onToggle }) => {
  return (
    <FocusableButton
      focusKey={focusKey}
      className={`episode-picker-card ${isWatched ? "checked" : ""}`}
      onClick={() => !disabled && onToggle(seasonNumber, episode.episodeNumber)}
      style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
    >
      <div className="episode-card-preview-wrap" style={{ position: "relative", borderColor: isWatched ? "var(--accent)" : "rgba(255,255,255,0.1)" }}>
        {/* On TV skip the still image entirely — this is a checkbox utility, and JPEG
            decode of every episode across every season is the dominant FPS cost. */}
        {!IS_TV && episode.stillPath ? (
          <img src={episode.stillPath} alt={episode.name} className="episode-card-image" loading="lazy" decoding="async" />
        ) : (
          <div className="episode-still-fallback-placeholder">
            <FilmOff size={28} />
          </div>
        )}
        <span className="episode-card-badge">{episode.episodeNumber}</span>
        <div className={`episode-picker-check ${isWatched ? "checked" : ""}`}>
          {isWatched && <Check size={12} strokeWidth={3.5} />}
        </div>
      </div>
      <div className="episode-card-info" style={{ marginTop: "8px" }}>
        <span className="episode-card-title">{episode.name}</span>
        {episode.airDate && (
          <span className="episode-card-date" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            {formatPickerDate(episode.airDate)}
          </span>
        )}
      </div>
    </FocusableButton>
  );
});
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
  const [loading, setLoading] = useState(true);
  const [seasonsData, setSeasonsData] = useState<{ seasonNumber: number; episodes: TvEpisode[] }[]>([]);
  const [selected, setSelected] = useState<{ season: number; number: number }[]>(initialSelected);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Enable native browser scroll inside the modal to avoid Layout Thrashing on TV
      setNativeScrollMode(true);
    } else {
      setNativeScrollMode(false);
      setFocus("SEASON_WATCH_TRIGGER");
    }
    return () => {
      setNativeScrollMode(false);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener("potok-back-pressed", handleBack);
    return () => window.removeEventListener("potok-back-pressed", handleBack);
  }, [isOpen, onClose]);

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
        const sorted = results.sort((a, b) => a.seasonNumber - b.seasonNumber);
        setSeasonsData(sorted);
        
        if (sorted.length > 0 && sorted[0].episodes.length > 0) {
          const firstEp = sorted[0].episodes[0];
          const firstSeasonNum = sorted[0].seasonNumber;
          setTimeout(() => {
            setFocus(`MULTIPICKER_EPISODE_${firstSeasonNum}_${firstEp.episodeNumber}`);
          }, 80);
        }
      } catch (err) {
        logger.error("Failed to load seasons for multipicker", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllSeasons();
  }, [isOpen, mediaId, numberOfSeasons, initialSelected]);

  const toggleEpisode = useCallback((season: number, number: number) => {
    setSelected((prev) => {
      const exists = prev.some((item) => item.season === season && item.number === number);
      if (exists) {
        return prev.filter((item) => !(item.season === season && item.number === number));
      } else {
        return [...prev, { season, number }];
      }
    });
  }, []);

  const toggleSeason = useCallback((seasonNumber: number, seasonEpisodes: TvEpisode[]) => {
    setSelected((prev) => {
      const seasonSelectedCount = prev.filter((item) => item.season === seasonNumber).length;
      const allSelected = seasonSelectedCount === seasonEpisodes.length;

      const filtered = prev.filter((item) => item.season !== seasonNumber);

      if (allSelected) {
        return filtered;
      } else {
        return [...filtered, ...seasonEpisodes.map((ep) => ({ season: seasonNumber, number: ep.episodeNumber }))];
      }
    });
  }, []);

  const selectAll = useCallback(() => {
    const allEpisodes = seasonsData.flatMap((s) =>
      s.episodes.map((ep) => ({ season: s.seasonNumber, number: ep.episodeNumber }))
    );
    setSelected(allEpisodes);
  }, [seasonsData]);

  const deselectAll = useCallback(() => {
    setSelected([]);
  }, []);

  // O(1) lookup set so PickerCard gets a stable boolean and the grid doesn't do
  // an O(n) `.some()` per card on every toggle.
  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => `${item.season}_${item.number}`)),
    [selected]
  );

  const formatSelectedRanges = useCallback((list: { season: number; number: number }[]): string => {
    if (list.length === 0) return "Ничего не выбрано";

    const grouped: Record<number, number[]> = {};
    for (const item of list) {
      if (!grouped[item.season]) {
        grouped[item.season] = [];
      }
      grouped[item.season].push(item.number);
    }

    const sortedSeasons = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    const parts: string[] = [];

    for (const s of sortedSeasons) {
      const nums = grouped[s].sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = nums[0];
      let prev = nums[0];

      for (let i = 1; i <= nums.length; i++) {
        const current = nums[i];
        if (current === prev + 1) {
          prev = current;
        } else {
          if (start === prev) {
            ranges.push(`${start}`);
          } else {
            ranges.push(`${start}-${prev}`);
          }
          start = current;
          prev = current;
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

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <FocusableContainer 
        focusKey="EPISODE_MULTIPICKER_CONTAINER"
        isFocusBoundary={true}
        className="modal-container episode-multipicker-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar: Info & Primary/Secondary Actions */}
        <div className="modal-sidebar">
          {/* Top Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="modal-title-text-group">
              <h3 className="modal-title" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#fff" }}>
                Выборочная отметка
              </h3>
              <span className="modal-subtitle" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                {mediaTitle}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255, 255, 255, 0.03)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>Выбрано серий:</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>
                {selected.length}
              </span>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", marginTop: "4px", wordBreak: "break-all", lineHeight: "1.3" }}>
                {formatSelectedRanges(selected)}
              </span>
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <FocusableButton 
              focusKey="MULTIPICKER_SAVE"
              className="potok-btn-primary" 
              style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, cursor: "pointer", textAlign: "center", fontSize: "0.95rem" }}
              onClick={handleSave} 
              disabled={loading || saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </FocusableButton>
            <FocusableButton 
              focusKey="MULTIPICKER_CANCEL"
              className="potok-btn-secondary" 
              style={{ width: "100%", background: "rgba(255, 255, 255, 0.06)", border: "none", padding: "14px", borderRadius: "10px", color: "#fff", fontWeight: 600, cursor: "pointer", textAlign: "center", fontSize: "0.95rem" }}
              onClick={onClose} 
              disabled={saving}
            >
              Отмена
            </FocusableButton>

            <div style={{ height: "8px" }} />

            <FocusableButton 
              focusKey="MULTIPICKER_SELECT_ALL"
              className="potok-badge potok-badge-secondary" 
              style={{ width: "100%", cursor: "pointer", border: "none", padding: "10px", borderRadius: "8px", fontSize: "0.8rem", background: "rgba(255, 255, 255, 0.04)", color: "#fff", fontWeight: 600, textAlign: "center" }}
              onClick={selectAll} 
              disabled={loading || saving}
            >
              Выбрать все
            </FocusableButton>
            <FocusableButton 
              focusKey="MULTIPICKER_DESELECT_ALL"
              className="potok-badge potok-badge-secondary" 
              style={{ width: "100%", cursor: "pointer", border: "none", padding: "10px", borderRadius: "8px", fontSize: "0.8rem", background: "rgba(255, 255, 255, 0.04)", color: "#fff", fontWeight: 600, textAlign: "center" }}
              onClick={deselectAll} 
              disabled={loading || saving}
            >
              Снять все
            </FocusableButton>
          </div>
        </div>

        {/* Right Scrollable Area */}
        <div className="modal-main-content">
          <div style={{ position: "absolute", top: "24px", right: "24px", zIndex: 10 }}>
            <FocusableButton 
              focusKey="MULTIPICKER_CLOSE_X"
              className="modal-close-btn"
              style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", padding: "8px", borderRadius: "50%" }}
              onClick={onClose} 
              aria-label="Закрыть"
            >
              <X size={20} />
            </FocusableButton>
          </div>

          <div className="episode-popup-body" style={{ flex: 1, overflowY: "auto", padding: "24px 30px" }}>
            {loading ? (
              <div className="picker-loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", color: "var(--text-secondary)" }}>
                <Loader2 className="multipicker-spinner" size={40} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
                <span>Загрузка серий...</span>
              </div>
            ) : (
              <div className="episode-picker-container" style={{ padding: "0" }}>
                {seasonsData.map((s) => {
                  const seasonSelectedCount = selected.filter((item) => item.season === s.seasonNumber).length;
                  const isAllSeasonSelected = s.episodes.length > 0 && seasonSelectedCount === s.episodes.length;

                  return (
                    <div key={s.seasonNumber} className="season-section" style={{ marginBottom: "32px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "8px", marginBottom: "16px" }}>
                        <h3 className="season-section-title" style={{ margin: 0 }}>Сезон {s.seasonNumber}</h3>
                        {s.episodes.length > 0 && (
                          <FocusableButton
                            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
                            onClick={() => toggleSeason(s.seasonNumber, s.episodes)}
                            disabled={saving}
                          >
                            {isAllSeasonSelected ? "Снять сезон" : "Выбрать сезон"}
                          </FocusableButton>
                        )}
                      </div>

                      <div className="episode-grid">
                        {s.episodes.map((ep) => (
                          <PickerCard
                            key={ep.id}
                            episode={ep}
                            seasonNumber={s.seasonNumber}
                            isWatched={selectedKeys.has(`${s.seasonNumber}_${ep.episodeNumber}`)}
                            disabled={saving}
                            focusKey={`MULTIPICKER_EPISODE_${s.seasonNumber}_${ep.episodeNumber}`}
                            onToggle={toggleEpisode}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </FocusableContainer>
    </div>,
    document.body
  );
};

export default EpisodeMultiPickerModal;

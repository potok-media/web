import React, { useState, useEffect, useCallback } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import { FocusableButton } from "./common/TVNavigation";

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
              stillPath: ep.stillPath || ep.still_path,
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
        console.error("Failed to load seasons for multipicker", err);
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + " г.";
    } catch {
      return dateStr;
    }
  };

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
      console.error("Failed to save episode selection", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "1000px", display: "flex", flexDirection: "column", height: "85vh" }}
      >
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-title-text-group">
              <h3 className="modal-title">Выборочная отметка серий</h3>
              <span className="modal-subtitle">{mediaTitle}</span>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <FocusableButton 
                className="potok-badge potok-badge-secondary" 
                style={{ cursor: "pointer", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "0.8rem", background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 600 }}
                onClick={selectAll} 
                disabled={loading || saving}
              >
                Выбрать все
              </FocusableButton>
              <FocusableButton 
                className="potok-badge potok-badge-secondary" 
                style={{ cursor: "pointer", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "0.8rem", background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 600 }}
                onClick={deselectAll} 
                disabled={loading || saving}
              >
                Снять все
              </FocusableButton>
            </div>
            <FocusableButton 
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", padding: "6px" }}
              onClick={onClose} 
              aria-label="Закрыть"
            >
              <X size={20} />
            </FocusableButton>
          </div>
        </div>

        {/* Content */}
        <div className="episode-popup-body" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {loading ? (
            <div className="picker-loading-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", color: "var(--text-secondary)" }}>
              <Loader2 className="multipicker-spinner" size={40} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
              <span>Загрузка серий...</span>
            </div>
          ) : (
            <div className="episode-picker-container" style={{ padding: "24px 32px" }}>
              {seasonsData.map((s) => {
                const seasonSelectedCount = selected.filter((item) => item.season === s.seasonNumber).length;
                const isAllSeasonSelected = s.episodes.length > 0 && seasonSelectedCount === s.episodes.length;

                return (
                  <div key={s.seasonNumber} className="season-section">
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
                      {s.episodes.map((ep) => {
                        const isWatched = selected.some(
                          (item) => item.season === s.seasonNumber && item.number === ep.episodeNumber
                        );
                        return (
                          <FocusableButton
                            key={ep.id}
                            className={`episode-picker-card ${isWatched ? "checked" : ""}`}
                            onClick={() => !saving && toggleEpisode(s.seasonNumber, ep.episodeNumber)}
                            style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}
                          >
                            <div className="episode-card-preview-wrap" style={{ position: "relative", borderColor: isWatched ? "var(--accent)" : "rgba(255,255,255,0.1)" }}>
                              {ep.stillPath || ep.still_path ? (
                                <img
                                  src={ep.stillPath || ep.still_path}
                                  alt={ep.name}
                                  className="episode-card-image"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="episode-still-fallback-placeholder">
                                  <FilmOff size={28} />
                                </div>
                              )}
                              <span className="episode-card-badge" style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                                {ep.episodeNumber}
                              </span>
                              
                              {/* Checkbox circle */}
                              <div 
                                style={{
                                  position: "absolute",
                                  top: "8px",
                                  right: "8px",
                                  width: "20px",
                                  height: "20px",
                                  borderRadius: "50%",
                                  border: "1.5px solid rgba(255,255,255,0.5)",
                                  background: isWatched ? "var(--accent)" : "rgba(0,0,0,0.5)",
                                  borderColor: isWatched ? "var(--accent)" : "rgba(255,255,255,0.5)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.2s ease",
                                  zIndex: 2
                                }}
                              >
                                {isWatched && <Check size={12} strokeWidth={3.5} style={{ color: "#fff" }} />}
                              </div>
                            </div>
                            
                            <div className="episode-card-info" style={{ marginTop: "8px" }}>
                              <span className="episode-card-title" style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)" }}>{ep.name}</span>
                              {ep.airDate && (
                                <span className="episode-card-date" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                  {formatDate(ep.airDate)}
                                </span>
                              )}
                            </div>
                          </FocusableButton>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          style={{
            padding: "20px 32px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(15, 15, 20, 0.95)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
              Выбрано серий: {selected.length}
            </span>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
              {formatSelectedRanges(selected)}
            </span>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <FocusableButton 
              style={{ background: "rgba(255,255,255,0.08)", border: "none", padding: "12px 24px", borderRadius: "8px", color: "#fff", fontWeight: 600, cursor: "pointer" }}
              onClick={onClose} 
              disabled={saving}
            >
              Отмена
            </FocusableButton>
            <FocusableButton
              className="close-btn"
              style={{ background: "var(--accent)", color: "#000", border: "none", padding: "12px 28px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </FocusableButton>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EpisodeMultiPickerModal;

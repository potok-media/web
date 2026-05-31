import React, { useState, useEffect } from "react";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import { useHUD } from "../context/HUDContext";
import type { TvEpisode } from "../network/ApiTypes";

interface SeasonEpisodesSectionProps {
  mediaId: number;
  numberOfSeasons: number;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number) => void;
}

export const SeasonEpisodesSection: React.FC<SeasonEpisodesSectionProps> = ({
  mediaId,
  numberOfSeasons,
  onEpisodeClick,
}) => {
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const { episodes, loading, error } = useSeasonEpisodes(mediaId, activeSeason);
  const { show: showHUD } = useHUD();

  // Reset active season back to 1 when mediaId changes to prevent loading incorrect seasons for a new show
  useEffect(() => {
    setActiveSeason(1);
  }, [mediaId]);

  useEffect(() => {
    if (error) {
      showHUD("error", error);
    }
  }, [error, showHUD]);

  if (numberOfSeasons <= 0) return null;

  return (
    <section className="season-episodes-section" style={{ minHeight: "350px" }}>
      <h2 className="season-episodes-title">Выбор серий</h2>
      <div className="tabs-header">
        {Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map((sNum) => (
          <button
            key={sNum}
            className={`tab-btn ${activeSeason === sNum ? "active" : ""}`}
            onClick={() => setActiveSeason(sNum)}
          >
            Сезон {sNum}
          </button>
        ))}
      </div>

      {loading ? (
        // Bulletproof Skeleton prevents Cumulative Layout Shift (CLS)
        <div 
          className="season-episodes-skeleton-grid" 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: "16px", 
            minHeight: "220px",
            marginTop: "16px"
          }}
        >
          {Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className="episode-card-skeleton" 
              style={{ 
                height: "230px", 
                background: "rgba(255, 255, 255, 0.03)", 
                borderRadius: "12px", 
                border: "1px solid rgba(255, 255, 255, 0.05)",
                opacity: 0.6,
              }} 
            />
          ))}
        </div>
      ) : episodes.length > 0 ? (
        <div className="episodes-grid">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="episode-card"
              onClick={() => onEpisodeClick(ep, activeSeason)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEpisodeClick(ep, activeSeason);
                }
              }}
            >
              <div className="episode-still-wrap">
                <img
                  src={ep.stillPath || "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=280&h=157"}
                  alt={ep.name}
                  className="episode-still"
                  loading="lazy"
                />
              </div>
              <div className="episode-info">
                <span className="episode-number-title">
                  Серия {ep.episodeNumber}: {ep.name}
                </span>
                {ep.overview && <p className="episode-overview">{ep.overview}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="season-episodes-empty">
          Нет сведений об эпизодах этого сезона.
        </div>
      )}
    </section>
  );
};

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSeasonEpisodes } from "../hooks/useSeasonEpisodes";
import { useHUD } from "../context/HUDContext";
import type { TvEpisode } from "../network/ApiTypes";
import { EpisodeCard } from "./EpisodeCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Grid } from "./common/Grid";

interface SeasonEpisodesSectionProps {
  mediaId: number;
  numberOfSeasons: number;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number) => void;
  selectedEpisode?: { episode: TvEpisode; seasonNumber: number } | null;
}

export const SeasonEpisodesSection: React.FC<SeasonEpisodesSectionProps> = ({
  mediaId,
  numberOfSeasons,
  onEpisodeClick,
  selectedEpisode,
}) => {
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const { episodes, loading, error } = useSeasonEpisodes(mediaId, activeSeason);
  const { show: showHUD } = useHUD();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollLimits = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  }, []);

  // Reset active season back to 1 when mediaId changes to prevent loading incorrect seasons for a new show
  useEffect(() => {
    setActiveSeason(1);
  }, [mediaId]);

  useEffect(() => {
    if (error) {
      showHUD("error", error);
    }
  }, [error, showHUD]);

  useEffect(() => {
    if (episodes.length > 0) {
      const timeoutId = setTimeout(checkScrollLimits, 150);
      return () => clearTimeout(timeoutId);
    } else {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, [episodes, checkScrollLimits]);

  useEffect(() => {
    window.addEventListener("resize", checkScrollLimits);
    return () => window.removeEventListener("resize", checkScrollLimits);
  }, [checkScrollLimits]);

  const handleScroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

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
        <Grid 
          minWidth="280px" 
          gap="16px" 
          className="season-episodes-skeleton-grid" 
          style={{ 
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
        </Grid>
      ) : episodes.length > 0 ? (
        <div className="episodes-carousel-wrapper">
          {canScrollLeft && (
            <button
              type="button"
              className="carousel-nav-btn left"
              onClick={() => handleScroll("left")}
              aria-label="Прокрутить назад"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="episodes-scroll-container"
            ref={scrollRef}
            onScroll={checkScrollLimits}
          >
            {episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                onClick={() => onEpisodeClick(ep, activeSeason)}
                isActive={selectedEpisode?.episode.id === ep.id}
              />
            ))}
          </div>

          {canScrollRight && (
            <button
              type="button"
              className="carousel-nav-btn right"
              onClick={() => handleScroll("right")}
              aria-label="Прокрутить вперед"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      ) : (
        <div className="season-episodes-empty">
          Нет сведений об эпизодах этого сезона.
        </div>
      )}
    </section>
  );
};

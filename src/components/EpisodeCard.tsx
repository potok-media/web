import React from "react";
import type { TvEpisode } from "../network/ApiTypes";

interface EpisodeCardProps {
  episode: TvEpisode;
  onClick: () => void;
  isActive?: boolean;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(({
  episode,
  onClick,
  isActive = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const [year, month, day] = dateStr.split("-");
      if (year && month && day && year.length === 4) {
        return `${day}.${month}.${year}`;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${d}.${m}.${y}`;
    } catch {
      return dateStr;
    }
  };

  const fallbackStill = "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=280&h=157";

  return (
    <div
      className={`episode-card ${isActive ? "active" : ""}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={handleKeyDown}
    >
      <div className="episode-still-wrap">
        <img
          src={episode.stillPath || episode.still_path || fallbackStill}
          alt={episode.name}
          className="episode-still"
          loading="lazy"
        />
      </div>
      <div className="episode-info">
        <span className="episode-number-title">
          {episode.episodeNumber}. {episode.name}
        </span>
        {episode.airDate && (
          <span className="episode-air-date">
            {formatDate(episode.airDate)}
          </span>
        )}
      </div>
    </div>
  );
});

export default EpisodeCard;


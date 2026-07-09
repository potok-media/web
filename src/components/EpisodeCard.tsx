import React, { useRef, useCallback } from "react";
import { Check } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import type { TvEpisode } from "../network/ApiTypes";

interface EpisodeCardProps {
  episode: TvEpisode;
  onClick: (episode: TvEpisode) => void;
  isActive?: boolean;
  isWatched?: boolean;
  isSelectMode?: boolean;
  onToggleWatched?: () => void;
  onContextMenu?: (episode: TvEpisode, clientX: number, clientY: number) => void;
  onFocus?: (episode: TvEpisode) => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = React.memo(({
  episode,
  onClick,
  isActive = false,
  isWatched = false,
  isSelectMode = false,
  onToggleWatched,
  onContextMenu,
  onFocus,
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = useCallback((e: React.TouchEvent) => {
    isLongPressRef.current = false;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (onContextMenu) {
        onContextMenu(episode, clientX, clientY);
      }
    }, 600); // 600ms threshold for long press
  }, [onContextMenu, episode]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      if (onToggleWatched) {
        onToggleWatched();
      }
    } else {
      onClick(episode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isSelectMode) {
        if (onToggleWatched) onToggleWatched();
      } else {
        onClick(episode);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(episode, e.clientX, e.clientY);
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

  return (
    <div
      className={`episode-card ${isActive ? "active" : ""} ${isWatched ? "watched" : ""} ${isSelectMode ? "select-mode" : ""}`}
      onClick={handleClick}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={endPress}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={onFocus ? () => onFocus(episode) : undefined}
    >
      <div className="episode-still-wrap">
        {episode.stillPath || episode.still_path ? (
          <img
            src={episode.stillPath || episode.still_path}
            alt={episode.name}
            className="episode-still"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="episode-still-fallback-placeholder">
            <FilmOff size="2rem" />
          </div>
        )}
        {isSelectMode ? (
          <div className="episode-checkbox-overlay">
            <div className="episode-select-checkbox">
              {isWatched && <Check size="1rem" strokeWidth={3} className="episode-select-checkbox-icon" />}
            </div>
          </div>
        ) : (
          isWatched && (
            <div className="episode-watched-badge">
              <Check size="0.875rem" strokeWidth={3} />
            </div>
          )
        )}
      </div>
      <span className="episode-number-title">
        {episode.episodeNumber && episode.episodeNumber > 0 ? `${episode.episodeNumber}. ` : ""}{episode.name}
      </span>
      {episode.airDate && (
        <span className="episode-air-date">
          {formatDate(episode.airDate)}
        </span>
      )}
    </div>
  );
});

export default EpisodeCard;

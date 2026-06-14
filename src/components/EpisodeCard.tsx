import React, { useRef, useCallback } from "react";
import { Check } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import type { TvEpisode } from "../network/ApiTypes";
import { Focusable } from "./common/TVNavigation";

interface EpisodeCardProps {
  episode: TvEpisode;
  onClick: () => void;
  isActive?: boolean;
  isWatched?: boolean;
  isSelectMode?: boolean;
  onToggleWatched?: () => void;
  onContextMenu?: (clientX: number, clientY: number) => void;
  onFocus?: () => void;
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
        onContextMenu(clientX, clientY);
      }
    }, 600); // 600ms threshold for long press
  }, [onContextMenu]);

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
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isSelectMode) {
        if (onToggleWatched) onToggleWatched();
      } else {
        onClick();
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e.clientX, e.clientY);
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
    <Focusable
      onFocus={onFocus}
      onEnterPress={() => {
        if (isSelectMode) {
          if (onToggleWatched) onToggleWatched();
        } else {
          onClick();
        }
      }}
    >
      {({ ref: focusRef, focused }) => {
        const setRefs = (node: HTMLDivElement | null) => {
          (focusRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        };
        return (
          <div
            ref={setRefs}
            className={`episode-card ${isActive ? "active" : ""} ${isWatched ? "watched" : ""} ${isSelectMode ? "select-mode" : ""} ${focused ? "focused" : ""}`}
            onClick={handleClick}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            onTouchMove={endPress}
            onContextMenu={handleContextMenu}
            role="button"
            onKeyDown={handleKeyDown}
          >
            <div className="episode-still-wrap">
              {episode.stillPath || episode.still_path ? (
                <img
                  src={episode.stillPath || episode.still_path}
                  alt={episode.name}
                  className="episode-still"
                  loading="lazy"
                />
              ) : (
                <div className="episode-still-fallback-placeholder">
                  <FilmOff size={32} />
                </div>
              )}
              {isSelectMode ? (
                <div className="episode-checkbox-overlay">
                  <div className="episode-select-checkbox">
                    {isWatched && <Check size={16} strokeWidth={3} style={{ color: "#fff" }} />}
                  </div>
                </div>
              ) : (
                isWatched && (
                  <div className="episode-watched-badge">
                    <Check size={14} strokeWidth={3} />
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
      }}
    </Focusable>
  );
});

export default EpisodeCard;

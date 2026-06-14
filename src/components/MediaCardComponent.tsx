import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import { Focusable } from "./common/TVNavigation";
import { usePerformanceTrack } from "../utils/PerformanceMonitor";
import type { MediaCard } from "../network/ApiClient";

interface MediaCardComponentProps {
  item: MediaCard;
  onClick?: (item: MediaCard) => void;
  style?: React.CSSProperties;
  delay?: number;
  focusKey?: string;
}

export const MediaCardComponent: React.FC<MediaCardComponentProps> = React.memo(({ item, onClick, style, focusKey }) => {
  usePerformanceTrack("MediaCardComponent");
  const [hasError, setHasError] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handleImageError = () => {
    setHasError(true);
  };

  const getEpisodeInfo = () => {
    if (item.nextEpisodeSeason && item.nextEpisodeNumber) {
      return `S${String(item.nextEpisodeSeason).padStart(2, "0")}E${String(item.nextEpisodeNumber).padStart(2, "0")}`;
    }
    if (item.progress?.nextSeason && item.progress?.nextEpisode) {
      return `S${String(item.progress.nextSeason).padStart(2, "0")}E${String(item.progress.nextEpisode).padStart(2, "0")}`;
    }
    if (item.progress?.lastSeason && item.progress?.lastEpisode) {
      return `S${String(item.progress.lastSeason).padStart(2, "0")}E${String(item.progress.lastEpisode).padStart(2, "0")}`;
    }
    return null;
  };

  const rating = item.tmdbRating || item.kpRating || item.imdbRating;
  const epInfo = getEpisodeInfo();
  const showProgress = item.progress && item.progress.percentage > 0;

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.altKey === false) {
      if (onClick) {
        e.preventDefault();
        onClick(item);
      }
    }
  };

  return (
    <Focusable
      focusKey={focusKey}
      onEnterPress={() => {
        if (onClick) {
          onClick(item);
        } else {
          cardRef.current?.click();
        }
      }}
    >
      {({ ref: focusRef, focused }) => {
        const setRefs = (node: HTMLAnchorElement | null) => {
          cardRef.current = node;
          (focusRef as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
        };
        return (
          <Link
            ref={setRefs}
            to={`/media/${item.mediaType}/${item.id}`}
            className={`media-card is-visible ${focused ? "focused" : ""}`}
            onClick={handleCardClick}
            style={style}
          >
            <div className="media-poster-wrap">
              {item.posterSrc && !hasError ? (
                <img
                  src={item.posterSrc}
                  className="media-poster"
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onError={handleImageError}
                  style={{
                    opacity: 0,
                    transition: "opacity 0.2s ease-in-out"
                  }}
                />
              ) : (
                <div className="media-poster-fallback-placeholder">
                  <FilmOff size={36} />
                </div>
              )}
              
              <div className="media-card-overlay">
                <div className="media-card-pills-row">
                  {epInfo && (
                    <span className="media-glass-pill episode-pill">{epInfo}</span>
                  )}
                  <div className="media-card-spacer" />
                  {rating && (
                    <span className="media-glass-pill rating-pill">
                      <Star size={11} fill="var(--warning)" stroke="var(--warning)" className="rating-star-icon" />
                      <span className="rating-value-text">{rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
                {showProgress && (
                  <div className="media-card-progress-container">
                    <div 
                      className="media-card-progress-bar" 
                      style={{ width: `${item.progress!.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="media-card-info">
              <h3 className="media-card-title">{item.title}</h3>
              {item.subtitle && <p className="media-card-subtitle">{item.subtitle}</p>}
            </div>
          </Link>
        );
      }}
    </Focusable>
  );
});

MediaCardComponent.displayName = "MediaCardComponent";
export default MediaCardComponent;

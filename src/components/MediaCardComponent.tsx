import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { MediaCard } from "../network/ApiClient";

// Shared singleton IntersectionObserver subscription system
type ObserverCallback = (entry: IntersectionObserverEntry) => void;
const subscribers = new WeakMap<Element, ObserverCallback>();

let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const callback = subscribers.get(entry.target);
          if (callback) {
            callback(entry);
          }
        }
      },
      {
        rootMargin: "160px 0px 160px 0px", // Trigger 160px early so transition finishes before viewport entry
        threshold: 0.01,
      }
    );
  }
  return sharedObserver;
}

interface MediaCardComponentProps {
  item: MediaCard;
  onClick?: (item: MediaCard) => void;
  style?: React.CSSProperties;
  delay?: number;
}

export const MediaCardComponent: React.FC<MediaCardComponentProps> = React.memo(({ item, onClick, style, delay = 0 }) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cardRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // If there is no poster, mark image as loaded immediately so we can show card structure
    if (!item.posterSrc) {
      setIsImageLoaded(true);
    }

    const element = cardRef.current;
    if (!element) return;

    const observer = getSharedObserver();

    const callback: ObserverCallback = (entry) => {
      setIsIntersecting(entry.isIntersecting);
    };

    subscribers.set(element, callback);
    observer.observe(element);

    return () => {
      subscribers.delete(element);
      observer.unobserve(element);
    };
  }, [item.id, item.posterSrc]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setIsImageLoaded(true); // Fallback to reveal card frame if download fails
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
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      if (onClick) {
        e.preventDefault();
        onClick(item);
      }
    }
  };

  // Guard reveal transition: Card only becomes visible when inside viewport AND image is fully loaded/decoded.
  // This completely eliminates Chromium's grey flash paint glitches on scroll.
  const isVisible = isIntersecting && isImageLoaded;

  return (
    <Link
      ref={cardRef}
      to={`/media/${item.mediaType}/${item.id}`}
      className={`media-card ${isVisible ? "is-visible" : ""}`}
      onClick={handleCardClick}
      style={{
        ...style,
        transitionDelay: isVisible ? `${delay}ms` : "0ms"
      }}
    >
      <div className="media-poster-wrap">
        {(isIntersecting || isImageLoaded) && (
          <img
            src={item.posterSrc || "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=160&h=240"}
            className="media-poster"
            alt={item.title}
            loading="lazy"
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {/* Dark bottom gradient overlay */}
        <div className="media-card-overlay">
          <div className="media-card-pills-row">
            {epInfo && (
              <span className="media-glass-pill episode-pill">{epInfo}</span>
            )}
            
            {/* Empty space filler for layout */}
            <div className="media-card-spacer" />
            
            {rating && (
              <span className="media-glass-pill rating-pill">
                <Star size={11} fill="var(--warning)" stroke="var(--warning)" className="rating-star-icon" />
                <span className="rating-value-text">{rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          
          {/* Frosted thin progress bar */}
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
      
      {/* Centered title & subtitle under poster */}
      <div className="media-card-info">
        <h3 className="media-card-title">{item.title}</h3>
        {item.subtitle && <p className="media-card-subtitle">{item.subtitle}</p>}
      </div>
    </Link>
  );
});

MediaCardComponent.displayName = "MediaCardComponent";
export default MediaCardComponent;

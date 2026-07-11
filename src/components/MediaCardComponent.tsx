import React, { useState, useRef, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star, Film, Tv } from "lucide-react";
import { FilmOff } from "./common/FilmOff";
import { useSettings } from "../context/AppSettingsContext";
import { resizeTmdbImage, posterSizeForQuality } from "../utils/mediaUtils";
import type { MediaCard } from "../network/ApiClient";
import { areMediaCardsEqual } from "./mediaCardCompare";

interface MediaCardComponentProps {
  item: MediaCard;
  onClick?: (item: MediaCard) => void;
  style?: React.CSSProperties;
  delay?: number;
  /** Episode badge + watch progress bar — only for the Continue (up-next) library tab. */
  showContinueOverlay?: boolean;
}

/** Matches .media-poster-wrap transform transition in media.css */
const CARD_ELEVATION_MS = 350;

const shallowCompareStyles = (
  prevStyle?: React.CSSProperties,
  nextStyle?: React.CSSProperties
): boolean => {
  if (prevStyle === nextStyle) return true;
  if (!prevStyle || !nextStyle) return false;
  const prevKeys = Object.keys(prevStyle);
  const nextKeys = Object.keys(nextStyle);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (
      prevStyle[key as keyof React.CSSProperties] !==
      nextStyle[key as keyof React.CSSProperties]
    ) {
      return false;
    }
  }
  return true;
};

const areMediaCardComponentsEqual = (
  prevProps: MediaCardComponentProps,
  nextProps: MediaCardComponentProps
): boolean => {
  return (
    prevProps.delay === nextProps.delay &&
    prevProps.showContinueOverlay === nextProps.showContinueOverlay &&
    shallowCompareStyles(prevProps.style, nextProps.style) &&
    areMediaCardsEqual(prevProps.item, nextProps.item)
  );
};

export const MediaCardComponent: React.FC<MediaCardComponentProps> = React.memo(
  ({ item, onClick, style, showContinueOverlay = false }) => {
    const [hasError, setHasError] = useState(false);
    const [paintUncontained, setPaintUncontained] = useState(false);
    const cardRef = useRef<HTMLAnchorElement>(null);
    const isElevatedRef = useRef(false);
    const deelevateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDeelevateTimer = () => {
      if (deelevateTimerRef.current !== null) {
        clearTimeout(deelevateTimerRef.current);
        deelevateTimerRef.current = null;
      }
    };

    useEffect(() => () => clearDeelevateTimer(), []);

    const handleElevateStart = () => {
      clearDeelevateTimer();
      isElevatedRef.current = true;
      setPaintUncontained(true);
    };

    const handleElevateEnd = () => {
      isElevatedRef.current = false;
      clearDeelevateTimer();
      deelevateTimerRef.current = setTimeout(() => {
        if (!isElevatedRef.current) setPaintUncontained(false);
        deelevateTimerRef.current = null;
      }, CARD_ELEVATION_MS);
    };

    const handlePosterTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "transform") return;
      if (!isElevatedRef.current) {
        clearDeelevateTimer();
        setPaintUncontained(false);
      }
    };
    const { bannerQuality } = useSettings();
    const { t } = useTranslation("media");
    const posterSrc = resizeTmdbImage(item.posterSrc, posterSizeForQuality(bannerQuality));

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
    const epInfo = showContinueOverlay ? getEpisodeInfo() : null;
    const showProgress = showContinueOverlay && item.progress && item.progress.percentage > 0;

    const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.altKey === false) {
        if (onClick) {
          e.preventDefault();
          onClick(item);
        }
      }
    };

    return (
      <RouterLink
        ref={cardRef}
        to={`/media/${item.mediaType}/${item.id}`}
        className={`media-card is-visible${paintUncontained ? " is-paint-uncontained" : ""}`}
        onClick={handleCardClick}
        onMouseEnter={handleElevateStart}
        onMouseLeave={handleElevateEnd}
        onFocus={handleElevateStart}
        onBlur={handleElevateEnd}
        style={style}
      >
        <div className="media-poster-wrap" onTransitionEnd={handlePosterTransitionEnd}>
          {posterSrc && !hasError ? (
            <img
              src={posterSrc}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onLoad={(e) => {
                e.currentTarget.classList.add("is-visible");
              }}
              onError={handleImageError}
              className="media-poster media-poster--fade-in"
            />
          ) : (
            <div className="media-poster-fallback-placeholder">
              <FilmOff size="2.25rem" />
            </div>
          )}
          
          <div className="media-card-overlay">
            <span
              className="media-glass-pill media-type-pill"
              aria-label={t(item.mediaType === "tv" ? "card.typeSeries" : "card.typeMovie")}
            >
              {item.mediaType === "tv" ? <Tv size="0.6875rem" /> : <Film size="0.6875rem" />}
            </span>
            <div className="media-card-pills-row">
              {epInfo && (
                <span className="media-glass-pill episode-pill">{epInfo}</span>
              )}
              <div className="media-card-spacer" />
              {rating && (
                <span className="media-glass-pill rating-pill">
                  <Star size="0.6875rem" fill="var(--warning)" stroke="var(--warning)" className="rating-star-icon" />
                  <span className="rating-value-text">{rating.toFixed(1)}</span>
                </span>
              )}
            </div>
            {showProgress && (
              <div className="media-card-progress-container">
                <div
                  className="media-card-progress-bar"
                  style={{ "--progress-width": `${item.progress!.percentage}%` } as React.CSSProperties}
                />
              </div>
            )}
          </div>
        </div>
        <h3 className="media-card-title">{item.title}</h3>
        {item.subtitle && <p className="media-card-subtitle">{item.subtitle}</p>}
      </RouterLink>
    );
  },
  areMediaCardComponentsEqual
);

MediaCardComponent.displayName = "MediaCardComponent";
export default MediaCardComponent;

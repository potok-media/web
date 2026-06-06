import React, { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Star, Eye, Bookmark } from "lucide-react";
import { useHUD } from "../context/HUDContext";

import { useMediaDetails } from "../hooks/useMediaDetails";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaOverviewSection } from "../components/MediaOverviewSection";
import { MediaCastSection } from "../components/MediaCastSection";
import type { TvEpisode, MediaCard } from "../network/ApiTypes";
import "../styles/media.css";

interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
}

export const MediaDetailsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mediaId = Number(id);
  const tmdbId = mediaId;

  const { show: showHUD } = useHUD();


  const mediaRef = useRef<MediaCard | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);

  const handleNavigateToStreams = useCallback((tab?: string, season?: number, episode?: number) => {
    const path = tab 
      ? `/media/${mediaType}/${mediaId}/watch/${tab}` 
      : `/media/${mediaType}/${mediaId}/watch`;
    navigate(path, {
      state: { season, episode, media: mediaRef.current }
    });
  }, [navigate, mediaType, mediaId]);

  const handleDeepLinkNavigate = useCallback((season?: number, episode?: number) => {
    handleNavigateToStreams("potok-torrents", season, episode);
  }, [handleNavigateToStreams]);

  const {
    media,
    loading,
    error,
    inWatchlist,
    isFavorite,
    isWatched,
    toggleWatchlist,
    toggleFavorite,
    toggleWatched,
    refetch,
  } = useMediaDetails({
    mediaType,
    mediaId,
    playParam: searchParams.get("play"),
    onNavigateToStreams: handleDeepLinkNavigate,
    showHUD,
  });

  mediaRef.current = media;

  // Reset selected episode when route details target changes
  useEffect(() => {
    setSelectedEpisode(null);
  }, [mediaId, mediaType]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !media) {
    return (
      <div className="media-not-found-container">
        <h2 className="media-not-found-title">{error || "Медиа не найдено"}</h2>
        <button className="overlay-btn" onClick={refetch}>Повторить загрузку</button>
      </div>
    );
  }

  const cast = media.cast || [];

  return (
    <div className="details-layout">
      <div className="immersive-hero-container">
        {media.backdropSrc && (
          <img src={media.backdropSrc} className="immersive-hero-backdrop" alt="" />
        )}
        <div className="immersive-hero-overlay" />
        <div className="immersive-hero-content">
          <div className="details-content-container">
            <div className="details-poster-sidebar">
              {media.logoSrc ? (
                <div className="details-logo-container">
                  <img src={media.logoSrc} className="details-logo" alt={media.title} />
                </div>
              ) : (
                <h1 className="details-title-fallback">{media.title}</h1>
              )}

              <div className="details-actions-container">
                {/* Dynamically Rendered Plugin Extension Slot for Media Actions (Plugins contribute their watch buttons here) */}
                <div
                  id="media-actions-slot"
                  data-props={JSON.stringify({
                    mediaId,
                    tmdbId,
                    mediaType,
                    title: media.title,
                    originalTitle: media.originalTitle,
                    media
                  })}
                />

                {/* Social and Watchlist row */}
                <div id="social-actions-row" className="details-actions-row">
                  <button
                    className={`action-btn-circle ${isWatched ? "active" : ""}`}
                    onClick={toggleWatched}
                    title={isWatched ? "Удалить из истории просмотра" : "Отметить просмотренным"}
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    className={`action-btn-circle ${inWatchlist ? "active" : ""}`}
                    onClick={toggleWatchlist}
                    title={inWatchlist ? "Удалить из списка ожидания" : "В список ожидания"}
                  >
                    <Bookmark size={18} fill={inWatchlist ? "var(--accent)" : "none"} />
                  </button>

                  <button
                    className={`action-btn-circle ${isFavorite ? "active" : ""}`}
                    onClick={toggleFavorite}
                    title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                  >
                    <Star size={18} fill={isFavorite ? "var(--accent)" : "none"} />
                  </button>
                </div>
              </div>
            </div>

            {/* Render dynamically extracted Media Overview section */}
            <MediaOverviewSection
              media={media}
              selectedEpisode={selectedEpisode}
              setSelectedEpisode={setSelectedEpisode}
            />
          </div>
        </div>
      </div>

      <div className="details-bottom-sections">
        {media.mediaType === "tv" && media.numberOfSeasons && (
          <div className="details-fullwidth-section">
            <SeasonEpisodesSection
              mediaId={media.id}
              numberOfSeasons={media.numberOfSeasons}
              selectedEpisode={selectedEpisode}
              onEpisodeClick={(ep, seasonNum) => {
                setSelectedEpisode({ episode: ep, seasonNumber: seasonNum });
              }}
            />
          </div>
        )}

        {cast.length > 0 && (
          <MediaCastSection cast={cast} />
        )}
      </div>
    </div>
  );
};

export default MediaDetailsPage;

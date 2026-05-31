import React, { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Star, Eye, Bookmark } from "lucide-react";
import { useHUD } from "../context/HUDContext";

import { useMediaDetails } from "../hooks/useMediaDetails";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ExtensionSlot } from "../components/common/ExtensionSlot";
import { DynamicBlock } from "../components/common/DynamicBlock";
import { MediaCastSection } from "../components/MediaCastSection";
import { MediaOverviewSection } from "../components/MediaOverviewSection";
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

  const { show: showHUD } = useHUD();


  const mediaRef = useRef<MediaCard | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);

  const handleNavigateToStreams = useCallback((season?: number, episode?: number) => {
    navigate(`/media/${mediaType}/${mediaId}/watch`, {
      state: { season, episode, media: mediaRef.current }
    });
  }, [navigate, mediaType, mediaId]);

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
    onNavigateToStreams: handleNavigateToStreams,
    showHUD,
  });

  if (media) {
    mediaRef.current = media;
  }

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
  const tmdbId = media.id;

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
                <DynamicBlock
                  name="media-details-actions"
                  contextProps={{ mediaId, tmdbId, mediaType, selectedEpisode, media }}
                >
                  {/* Dynamically Rendered Plugin Extension Slot for Media Actions (Plugins contribute their watch buttons here) */}
                  <ExtensionSlot
                    id="media-actions"
                    name="media-actions"
                    props={{
                      mediaId,
                      tmdbId,
                      mediaType,
                      season: selectedEpisode?.seasonNumber,
                      episode: selectedEpisode?.episode.episodeNumber,
                      title: media.title,
                      originalTitle: media.originalTitle
                    }}
                  />

                  {/* 3. Social and Watchlist row */}
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
                </DynamicBlock>
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
              onEpisodeClick={(ep, seasonNum) => {
                setSelectedEpisode({ episode: ep, seasonNumber: seasonNum });
              }}
            />
          </div>
        )}

        <MediaCastSection cast={cast} />
      </div>
    </div>
  );
};

export default MediaDetailsPage;

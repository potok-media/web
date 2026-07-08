import React, { useCallback, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Star, Eye, Bookmark } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { Slot } from "../components/common/extension/Slot";

import { useMediaDetails } from "../hooks/useMediaDetails";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MediaOverviewSection } from "../components/MediaOverviewSection";
import { MediaCastSection } from "../components/MediaCastSection";
import { EpisodeMultiPickerModal } from "../components/EpisodeMultiPickerModal";
import type { TvEpisode, MediaCard } from "../network/ApiTypes";
import "../styles/media.css";

interface SelectedEpisodeState {
  episode: TvEpisode;
  seasonNumber: number;
}

const ErrorView: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation("media");
  return (
    <div className="media-not-found-container">
      <h2 className="media-not-found-title">{error}</h2>
      <button type="button" className="overlay-btn" onClick={onRetry}>{t("common.retry")}</button>
    </div>
  );
};

export const MediaDetailsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mediaId = Number(id);
  const tmdbId = mediaId;

  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const layoutModifier = isMobile 
    ? "details-layout--mobile" 
    : "details-layout--desktop";

  const mediaRef = useRef<MediaCard | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);
  const [isMultiPickerOpen, setIsMultiPickerOpen] = useState(false);

  const handleNavigateToStreams = useCallback((tab?: string, season?: number, episode?: number) => {
    const path = tab 
      ? `/media/${mediaType}/${mediaId}/streams/${tab}` 
      : `/media/${mediaType}/${mediaId}/streams`;
    
    const params = new URLSearchParams();
    if (season !== undefined) params.set("season", String(season));
    if (episode !== undefined) params.set("episode", String(episode));
    
    const searchStr = params.toString();
    const targetPath = searchStr ? `${path}?${searchStr}` : path;
    
    navigate(targetPath, { state: { media: mediaRef.current } });
  }, [mediaType, mediaId, navigate]);

  const {
    media,
    loading,
    error,
    refetch,
    isFavorite,
    inWatchlist,
    isWatched,
    toggleFavorite,
    toggleWatchlist,
    toggleWatched,
    toggleEpisodeWatched,
    toggleSeasonWatched,
    saveEpisodeSelection,
  } = useMediaDetails({
    mediaType,
    mediaId,
    playParam: searchParams.get("play"),
    onNavigateToStreams: (season, episode) => handleNavigateToStreams(undefined, season, episode),
    showHUD,
  });

  // Keep mediaRef.current in sync with the loaded media
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  // Auto-play / Deep-link to streams trigger
  useEffect(() => {
    if (loading || !media) return;
    const shouldPlay = searchParams.get("play") === "true";
    if (shouldPlay) {
      if (media.mediaType === "movie") {
        handleNavigateToStreams();
      } else {
        // Deep-link to specified or last watched/first episode
        const deepSeason = searchParams.get("season") ? Number(searchParams.get("season")) : undefined;
        const deepEpisode = searchParams.get("episode") ? Number(searchParams.get("episode")) : undefined;
        
        if (deepSeason !== undefined && deepEpisode !== undefined) {
          handleNavigateToStreams(undefined, deepSeason, deepEpisode);
        } else if (media.progress?.nextSeason && media.progress?.nextEpisode) {
          handleNavigateToStreams(undefined, media.progress.nextSeason, media.progress.nextEpisode);
        } else if (media.progress?.lastSeason && media.progress?.lastEpisode) {
          handleNavigateToStreams(undefined, media.progress.lastSeason, media.progress.lastEpisode);
        } else {
          // Fallback to S1E1 if no progress is found
          handleNavigateToStreams(undefined, 1, 1);
        }
      }
    }
  }, [loading, media, searchParams, handleNavigateToStreams]);

  if (loading) return <LoadingSpinner />;
  if (error || !media) return <ErrorView error={error || t("details.loadError")} onRetry={refetch} />;

  const cast = media.cast || [];

  return (
    <div className={`details-layout ${layoutModifier}`}>
      <div className="immersive-hero-container">
        {media.backdropSrc && (
          <img
            src={media.backdropSrc}
            className="immersive-hero-backdrop details-hero-backdrop"
            alt=""
            decoding="async"
            onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
          />
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
                {/* Dynamically Rendered Plugin Extension Slot for Media Actions */}
                <Slot
                  name="media-actions"
                  props={{
                    mediaId,
                    tmdbId,
                    mediaType,
                    title: media.title,
                    originalTitle: media.originalTitle,
                    media,
                    season: selectedEpisode?.seasonNumber,
                    episode: selectedEpisode?.episode.episodeNumber
                  }}
                />

                {/* Social and Watchlist row */}
                <div id="social-actions-row" className="details-actions-row">
                  <button
                    type="button"
                    className={`action-btn-circle ${isWatched ? "active" : ""}`}
                    onClick={toggleWatched}
                    title={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                  >
                    <Eye size="1.125rem" />
                  </button>

                  <button
                    type="button"
                    className={`action-btn-circle ${inWatchlist ? "active" : ""}`}
                    onClick={toggleWatchlist}
                    title={inWatchlist ? t("details.removeFromWatchlist") : t("details.addToWatchlist")}
                  >
                    <Bookmark size="1.125rem" fill={inWatchlist ? "var(--accent)" : "none"} />
                  </button>

                  <button
                    type="button"
                    className={`action-btn-circle ${isFavorite ? "active" : ""}`}
                    onClick={toggleFavorite}
                    title={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                  >
                    <Star size="1.125rem" fill={isFavorite ? "var(--accent)" : "none"} />
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
        {media.mediaType === "tv" && media.numberOfSeasons !== undefined && media.numberOfSeasons > 0 && (
          <div className="details-fullwidth-section">
            <SeasonEpisodesSection
              mediaId={media.id}
              numberOfSeasons={media.numberOfSeasons!}
              selectedEpisode={selectedEpisode}
              onEpisodeClick={(ep, seasonNum) => {
                setSelectedEpisode({ episode: ep, seasonNumber: seasonNum });
              }}
              watchedEpisodes={media.progress?.watchedEpisodes || []}
              toggleEpisodeWatched={toggleEpisodeWatched}
              toggleSeasonWatched={toggleSeasonWatched}
              onOpenMultiPicker={() => setIsMultiPickerOpen(true)}
            />

            {isMultiPickerOpen && (
              <EpisodeMultiPickerModal
                isOpen={isMultiPickerOpen}
                onClose={() => setIsMultiPickerOpen(false)}
                mediaId={media.id}
                mediaTitle={media.title}
                numberOfSeasons={media.numberOfSeasons!}
                initialSelected={media.progress?.watchedEpisodes || []}
                onSave={saveEpisodeSelection}
              />
            )}
          </div>
        )}

        {/* Dynamically Rendered Plugin Extension Slot for Details Bottom Content */}
        <Slot
          name="details-bottom"
          props={{
            mediaId,
            tmdbId,
            mediaType,
            title: media.title,
            originalTitle: media.originalTitle,
            media
          }}
        />

        {cast.length > 0 && (
          <MediaCastSection cast={cast} />
        )}
      </div>
    </div>
  );
};

export default MediaDetailsPage;

import React, { useCallback, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Star, Eye, Bookmark } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { Slot } from "../components/common/extension/Slot";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { Focusable, FocusableButton } from "../components/common/TVNavigation";
import { PlatformManager } from "../utils/PlatformManager";

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

export const MediaDetailsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mediaId = Number(id);
  const tmdbId = mediaId;

  const { t } = useTranslation("media");
  const { show: showHUD } = useHUD();

  const isTV = PlatformManager.isTV();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768 && !isTV);

  useEffect(() => {
    if (isTV) return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isTV]);

  const layoutModifier = isTV 
    ? "details-layout--tv" 
    : isMobile 
      ? "details-layout--mobile" 
      : "details-layout--desktop";


  const mediaRef = useRef<MediaCard | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);
  const [isMultiPickerOpen, setIsMultiPickerOpen] = useState(false);

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
    toggleEpisodeWatched,
    toggleSeasonWatched,
    saveEpisodeSelection,
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

  useEffect(() => {
    if (media) {
      // Restore focus on Back (e.g. from the streams page); default to the Watch button.
      restoreFocusOrDefault(location.key || location.pathname, "DETAILS_WATCHED_BTN");
    }
  }, [media, location.key, location.pathname]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !media) {
    return (
      <div className="media-not-found-container">
        <h2 className="media-not-found-title">{error || t("details.notFound")}</h2>
        <FocusableButton className="overlay-btn" onClick={refetch}>{t("common.retry")}</FocusableButton>
      </div>
    );
  }

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
                {/* Dynamically Rendered Plugin Extension Slot for Media Actions (Plugins contribute their watch buttons here) */}
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
                  <Focusable
                    focusKey="DETAILS_WATCHED_BTN"
                    onEnterPress={toggleWatched}
                  >
                    {({ ref: focusRef, focused }) => (
                      <button
                        ref={focusRef}
                        className={`action-btn-circle ${isWatched ? "active" : ""} ${focused ? "focused" : ""}`}
                        onClick={toggleWatched}
                        title={isWatched ? t("details.removeFromHistory") : t("details.markWatched")}
                      >
                        <Eye size="1.125rem" />
                      </button>
                    )}
                  </Focusable>

                  <Focusable
                    onEnterPress={toggleWatchlist}
                  >
                    {({ ref: focusRef, focused }) => (
                      <button
                        ref={focusRef}
                        className={`action-btn-circle ${inWatchlist ? "active" : ""} ${focused ? "focused" : ""}`}
                        onClick={toggleWatchlist}
                        title={inWatchlist ? t("details.removeFromWatchlist") : t("details.addToWatchlist")}
                      >
                        <Bookmark size="1.125rem" fill={inWatchlist ? "var(--accent)" : "none"} />
                      </button>
                    )}
                  </Focusable>

                  <Focusable
                    onEnterPress={toggleFavorite}
                  >
                    {({ ref: focusRef, focused }) => (
                      <button
                        ref={focusRef}
                        className={`action-btn-circle ${isFavorite ? "active" : ""} ${focused ? "focused" : ""}`}
                        onClick={toggleFavorite}
                        title={isFavorite ? t("details.removeFromFavorites") : t("details.addToFavorites")}
                      >
                        <Star size="1.125rem" fill={isFavorite ? "var(--accent)" : "none"} />
                      </button>
                    )}
                  </Focusable>
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
              watchedEpisodes={media.progress?.watchedEpisodes || []}
              toggleEpisodeWatched={toggleEpisodeWatched}
              toggleSeasonWatched={toggleSeasonWatched}
              onOpenMultiPicker={() => setIsMultiPickerOpen(true)}
            />

            {/* Multi-picker popup is disabled on TV — it renders every episode of
                every season and tanks FPS. On TV the season-watch button toggles the
                whole season instead (see SeasonEpisodesSection). */}
            {!PlatformManager.isTV() && (
              <EpisodeMultiPickerModal
                isOpen={isMultiPickerOpen}
                onClose={() => setIsMultiPickerOpen(false)}
                mediaId={media.id}
                mediaTitle={media.title}
                numberOfSeasons={media.numberOfSeasons}
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

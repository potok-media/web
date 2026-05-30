import React, { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Star, Eye, Bookmark, Play } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { useMediaDetails } from "../hooks/useMediaDetails";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ExtensionSlot } from "../components/common/ExtensionSlot";
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
  const { services } = useAppSettings();

  const mediaRef = useRef<MediaCard | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<SelectedEpisodeState | null>(null);

  const handleNavigateToTorrents = useCallback((season?: number, episode?: number) => {
    navigate(`/media/${mediaType}/${mediaId}/torrents`, {
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
    onNavigateToTorrents: handleNavigateToTorrents,
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
  const canWatch = !!(services?.searchEngine?.configured && services?.searchEngine?.online);

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
                {/* 1. Core Primary Watch torrent button */}
                {canWatch ? (
                  <Link
                    to={`/media/${mediaType}/${mediaId}/torrents${selectedEpisode ? `?season=${selectedEpisode.seasonNumber}&episode=${selectedEpisode.episode.episodeNumber}` : ""}`}
                    state={{
                      season: selectedEpisode?.seasonNumber,
                      episode: selectedEpisode?.episode.episodeNumber,
                      media
                    }}
                    className="btn-watch-primary"
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        if (selectedEpisode) {
                          handleNavigateToTorrents(selectedEpisode.seasonNumber, selectedEpisode.episode.episodeNumber);
                        } else {
                          handleNavigateToTorrents();
                        }
                      }
                    }}
                  >
                    <Play size={18} fill="black" />
                    <span>Смотреть</span>
                  </Link>
                ) : (
                  <button
                    className="btn-watch-primary disabled"
                    title={services?.searchEngine?.configured ? "Поисковый шлюз недоступен. Функция поиска торрентов временно заблокирована." : "Поисковик по торрентам не настроен. Вы можете настроить его в параметрах."}
                  >
                    <Play size={18} fill="currentColor" />
                    <span>Смотреть</span>
                  </button>
                )}

                {/* 2. Dynamically Rendered Plugin Extension Slot for Media Actions (Online Balancer buttons go here) */}
                <ExtensionSlot
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
                <div className="details-actions-row">
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

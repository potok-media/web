import React, { useCallback, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Play, Star, Eye, Bookmark } from "lucide-react";
import { useHUD } from "../context/HUDContext";
import { useAppSettings } from "../context/AppSettingsContext";
import { useMediaDetails } from "../hooks/useMediaDetails";
import { SeasonEpisodesSection } from "../components/SeasonEpisodesSection";
import { LoadingSpinner } from "../components/LoadingSpinner";
import type { TvEpisode } from "../network/ApiTypes";
import "../styles/media.css";

export const MediaDetailsPage: React.FC = () => {
  const { mediaType, id } = useParams<{ mediaType: string; id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mediaId = Number(id);

  const { show: showHUD } = useHUD();
  const { services } = useAppSettings();

  const mediaRef = useRef<any>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<{ episode: TvEpisode; seasonNumber: number } | null>(null);

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
            <button
              className={`btn-watch-primary ${!canWatch ? "disabled" : ""}`}
              onClick={() => {
                if (!canWatch) return;
                if (selectedEpisode) {
                  handleNavigateToTorrents(selectedEpisode.seasonNumber, selectedEpisode.episode.episodeNumber);
                } else {
                  handleNavigateToTorrents();
                }
              }}
              title={!canWatch ? (services?.searchEngine?.configured ? "Поисковый шлюз недоступен. Функция поиска торрентов временно заблокирована." : "Поисковик по торрентам не настроен. Вы можете настроить его в параметрах.") : undefined}
            >
              <Play size={18} fill={canWatch ? "black" : "currentColor"} />
              <span>Смотреть</span>
            </button>

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

            {!canWatch && (
              <div className="search-warning-text">
                {services?.searchEngine?.configured ? "Шлюз поиска недоступен" : "Поиск не настроен"}
              </div>
            )}
          </div>
        </div>

        {selectedEpisode ? (
          <div className="details-main-info selected-episode-mode">
            {media.originalTitle && <p className="details-subtitles">{media.originalTitle}</p>}

            <h2 className="details-episode-title">
              S{selectedEpisode.seasonNumber} • E{selectedEpisode.episode.episodeNumber} — {selectedEpisode.episode.name || `Серия ${selectedEpisode.episode.episodeNumber}`}
            </h2>

            <div className="hero-metadata details-hero-metadata">
              {selectedEpisode.episode.airDate && (
                <span>{selectedEpisode.episode.airDate}</span>
              )}
              <span>• 1080p</span>
              {media.genres && <span>• {media.genres}</span>}
            </div>

            <p className="details-overview-text">
              {selectedEpisode.episode.overview || media.overview || "Описание эпизода отсутствует."}
            </p>

            <button 
              className="details-reset-episode-btn"
              onClick={() => setSelectedEpisode(null)}
            >
              ← Вернуться к описанию сериала
            </button>
          </div>
        ) : (
          <div className="details-main-info">
            {media.originalTitle && <p className="details-subtitles">{media.originalTitle}</p>}

            <div className="hero-metadata details-hero-metadata">
              {media.studioLogoSrc && (
                <img src={media.studioLogoSrc} className="details-studio-logo" alt="Studio" />
              )}
              {media.subtitle && <span className="details-metadata-subtitle">{media.subtitle}</span>}
              {media.genres && <span>• {media.genres}</span>}
              {media.ageRating && <span>• {media.ageRating}</span>}
              {media.numberOfSeasons && <span>• Сезонов: {media.numberOfSeasons}</span>}
            </div>

            {media.overview && (
              <p className="details-overview-text">{media.overview}</p>
            )}

            <div className="details-rating-container">
              {media.imdbRating && (
                <span className="rating-badge details-rating-badge">
                  <Star size={12} fill="white" />
                  <span>IMDb {media.imdbRating.toFixed(1)}</span>
                </span>
              )}
              {media.kpRating && (
                <span className="kp-rating-badge details-rating-badge">
                  <span>КП {media.kpRating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
        )}
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

        {cast.length > 0 && (
          <div className="details-fullwidth-section">
            <h2 className="carousel-title details-section-title">Актерский состав</h2>
            <div className="cast-crew-grid">
              {cast.slice(0, 10).map((c, i) => (
                <div key={i} className="cast-member-card">
                  <div className="cast-photo-wrap">
                    <img
                      src={c.profileSrc || c.ProfileSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64"}
                      alt={c.name || c.Name}
                      className="cast-photo"
                    />
                  </div>
                  <span className="cast-name">{c.name || c.Name}</span>
                  <span className="cast-role">{c.character || c.Character || c.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaDetailsPage;

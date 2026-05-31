import React, { useState, useEffect } from "react";
import { Play, CheckCircle2, ArrowLeft, Pencil } from "lucide-react";

export interface GenericEpisodeItem {
  id: string;
  season: number;
  episode: number;
  title?: string;
  stillPath?: string;
  airDate?: string;
  isWatched?: boolean;
  sizeLabel?: string;
  audios: Array<{ id: string; name: string; url?: string }>;
  url?: string;
}

const getStreamType = (ep: GenericEpisodeItem): string => {
  const url = ep.url || (ep.audios && ep.audios[0]?.url) || "";
  if (url.includes(".mpd")) {
    return "DASH";
  }
  if (url.includes(".m3u8")) {
    return "HLS";
  }
  const match = url.match(/\.[a-zA-Z0-9]{2,5}$/);
  return match ? match[0].replace(".", "").toUpperCase() : "MP4";
};

// Generic Row component representing a single episode or stream file
interface EpisodeSelectorRowProps {
  episodeItem: GenericEpisodeItem;
  mediaType: string;
  backdropSrc?: string;
  posterSrc?: string;
  onPlay: () => void;
}

const EpisodeSelectorRow: React.FC<EpisodeSelectorRowProps> = React.memo(({
  episodeItem,
  mediaType,
  backdropSrc,
  posterSrc,
  onPlay,
}) => {
  const displayTitle = episodeItem.title || `Серия ${episodeItem.episode}`;
  
  let displaySubtitle = "";
  if (mediaType === "tv") {
    displaySubtitle = `Сезон ${episodeItem.season} • Серия ${episodeItem.episode}`;
    if (episodeItem.airDate) {
      try {
        const airDateStr = new Date(episodeItem.airDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
        displaySubtitle += ` • ${airDateStr}`;
      } catch (e) {
        // Safe fallback
      }
    }
  }

  const imageUrl = episodeItem.stillPath || backdropSrc || posterSrc;
  const sizeLabel = episodeItem.sizeLabel || (episodeItem.audios && episodeItem.audios.length > 0 
    ? `${episodeItem.audios.length} ${episodeItem.audios.length === 1 ? "озвучка" : episodeItem.audios.length < 5 ? "озвучки" : "озвучек"}`
    : "Основной поток");

  const streamType = getStreamType(episodeItem);

  return (
    <div
      className="file-card-row"
      onClick={onPlay}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay();
        }
      }}
    >
      <div className="file-card-banner">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="file-card-image"
            loading="lazy"
          />
        ) : (
          <div className="file-card-preview-placeholder" />
        )}
        <div className="file-card-banner-overlay" />
        {episodeItem.episode && episodeItem.episode > 0 && (
          <span className="file-card-bg-number">{episodeItem.episode}</span>
        )}
        {episodeItem.isWatched && (
          <div className="file-card-badge-checked">
            <CheckCircle2 size={20} fill="var(--accent)" stroke="var(--bg-surface)" />
          </div>
        )}
      </div>

      <div className="file-card-info-panel">
        <h4 className="file-card-title">{displayTitle}</h4>
        {displaySubtitle && displaySubtitle !== displayTitle && (
          <span className="file-card-subtitle">{displaySubtitle}</span>
        )}
      </div>

      <div className="file-card-details-panel">
        {episodeItem.isWatched && (
          <div className="file-card-watched-badge">
            <CheckCircle2 size={11} fill="var(--accent)" stroke="var(--accent-dim)" />
            <span>Просмотрено</span>
          </div>
        )}
        {sizeLabel && <span className="file-card-size">{sizeLabel}</span>}
        {streamType && (
          <span className="file-card-ext-badge">
            {streamType.toLowerCase()}
          </span>
        )}
      </div>

      <button className="file-card-play-btn" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
        <Play size={16} fill="currentColor" className="file-card-play-icon-fix" />
      </button>
    </div>
  );
});

// Generic Header component for the Selector popup
interface EpisodeSelectorHeaderProps {
  isEditing: boolean;
  onClose: () => void;
  onBackToFiles: () => void;
  title: string;
  subtitle?: string;
  mediaType: string;
  completedCount: number;
  totalCount: number;
  percentage: number;
  parsingFailed: boolean;
  onStartEditing?: () => void;
}

const EpisodeSelectorHeader: React.FC<EpisodeSelectorHeaderProps> = React.memo(({
  isEditing,
  onClose,
  onBackToFiles,
  title,
  subtitle,
  mediaType,
  completedCount,
  totalCount,
  percentage,
  parsingFailed,
  onStartEditing,
}) => {
  const handleBackOrClose = isEditing ? onBackToFiles : onClose;

  return (
    <div className="modal-header">
      <div className="modal-title-row">
        <button className="modal-close-btn" onClick={handleBackOrClose}>
          <ArrowLeft size={20} />
        </button>
        <div className="modal-title-text-group">
          <h3 className="modal-title modal-title-custom-size">{title}</h3>
          {subtitle && (
            <span className="modal-subtitle modal-subtitle-text">
              {subtitle}
            </span>
          )}
          
          {mediaType === "tv" && totalCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size={12} fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>
                Просмотрено серий: {completedCount} из {totalCount} ({Math.round(percentage)}%)
              </span>
            </div>
          )}

          {mediaType === "movie" && completedCount > 0 && (
            <div className="tv-progress-container">
              <CheckCircle2 size={12} fill="var(--accent)" stroke="var(--bg-surface)" />
              <span>Просмотрено</span>
            </div>
          )}
        </div>
      </div>

      <div className="modal-header-actions-row">
        {parsingFailed && !isEditing && (
          <div className="parsing-hint-banner">
            Не удалось распознать сезоны? <br />
            Возможно, понадобится указать соответствие серий для отслеживания.
          </div>
        )}

        {mediaType === "tv" && !isEditing && totalCount > 0 && onStartEditing && (
          <button className="edit-btn" onClick={onStartEditing}>
            <Pencil size={14} />
            <span>Править</span>
          </button>
        )}

        <button className="close-btn" onClick={handleBackOrClose}>
          {isEditing ? "Назад" : "Закрыть"}
        </button>
      </div>
    </div>
  );
});

// Generic Grid Selector for choosing TMDB offsets
interface EpisodeOverridePickerProps {
  seasons: any[];
  seasonsLoading: boolean;
  onApplyOverride: (seasonNum: number, epNum: number) => void;
}

const EpisodeOverridePicker: React.FC<EpisodeOverridePickerProps> = React.memo(({
  seasons,
  seasonsLoading,
  onApplyOverride,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + " г.";
    } catch {
      return dateStr;
    }
  };

  if (seasonsLoading) {
    return (
      <div className="picker-loading-container">
        <div className="spinner picker-loading-spinner-wrap" />
        <span className="picker-loading-label">Загрузка серий с TMDB...</span>
      </div>
    );
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">С какой серии начинается этот список?</h4>
      {seasons.map((season: any) => {
        const seasonNum = season.seasonNumber ?? season.season_number ?? 1;
        const episodes = season.episodes ?? [];
        if (episodes.length === 0) return null;

        return (
          <div key={season.id || seasonNum} className="season-section">
            <h3 className="season-section-title">Сезон {seasonNum}</h3>
            <div className="episode-grid">
              {episodes.map((episode: any) => {
                const epNum = episode.episodeNumber ?? episode.episode_number ?? 1;
                const epName = episode.name || `Серия ${epNum}`;
                const epStill = episode.stillPath || episode.still_path;
                const epAirDate = episode.airDate || episode.air_date;

                return (
                  <button
                    key={episode.id || epNum}
                    className="episode-picker-card"
                    onClick={() => onApplyOverride(seasonNum, epNum)}
                  >
                    <div className="episode-card-preview-wrap">
                      {epStill ? (
                        <img
                          src={epStill}
                          alt={epName}
                          className="episode-card-image"
                           loading="lazy"
                        />
                      ) : (
                        <div className="picker-card-placeholder" />
                      )}
                      <span className="episode-card-badge">{epNum}</span>
                    </div>
                    <div className="episode-card-info">
                      <span className="episode-card-title">{epName}</span>
                      {epAirDate && (
                        <span className="episode-card-date">{formatDate(epAirDate)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// The Main Episode Selector Popup modal
interface EpisodeSelectorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  
  onStartEditing?: () => void;
  onApplyOverride?: (seasonNum: number, epNum: number) => void;
  seasons?: any[];
  seasonsLoading?: boolean;
  isSaving?: boolean;
  tmdbSeasonsCount?: number;
  backdropSrc?: string;
  posterSrc?: string;
  mediaType?: string;
}

export const EpisodeSelectorPopup: React.FC<EpisodeSelectorPopupProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  episodes = [],
  onPlay,
  onStartEditing,
  onApplyOverride,
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  tmdbSeasonsCount,
  backdropSrc,
  posterSrc,
  mediaType = "tv",
}) => {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  const uniqueSeasons = Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b);

  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [episodes, uniqueSeasons, selectedSeason]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSeasonEpisodes = React.useMemo(() => {
    return episodes.filter((e) => e.season === selectedSeason);
  }, [episodes, selectedSeason]);

  const handleStartEditing = () => {
    setIsEditing(true);
    if (onStartEditing) {
      onStartEditing();
    }
  };

  const handleApplyOverrideInternal = (seasonNum: number, epNum: number) => {
    if (onApplyOverride) {
      onApplyOverride(seasonNum, epNum);
    }
    setIsEditing(false);
  };

  const completedCount = episodes.filter(e => e.isWatched).length;
  const totalCount = episodes.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const tmdbCount = tmdbSeasonsCount || 1;
  const maxSeasonInBalancer = uniqueSeasons.length > 0 ? Math.max(...uniqueSeasons) : 1;
  const parsingFailed = maxSeasonInBalancer > tmdbCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: isEditing ? "1000px" : "850px", display: "flex", flexDirection: "column" }}
      >
        <EpisodeSelectorHeader
          isEditing={isEditing}
          onClose={onClose}
          onBackToFiles={() => setIsEditing(false)}
          title={title}
          subtitle={subtitle}
          mediaType={mediaType}
          completedCount={completedCount}
          totalCount={totalCount}
          percentage={percentage}
          parsingFailed={parsingFailed}
          onStartEditing={onStartEditing ? handleStartEditing : undefined}
        />
        <div className="episode-popup-body" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {isEditing ? (
            <EpisodeOverridePicker
              seasons={seasons}
              seasonsLoading={seasonsLoading}
              onApplyOverride={handleApplyOverrideInternal}
            />
          ) : (
            <div className="files-list-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {uniqueSeasons.length > 1 && (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  {uniqueSeasons.map((sNum) => (
                    <button
                      key={sNum}
                      className={`potok-badge ${selectedSeason === sNum ? "potok-badge-info" : "potok-badge-secondary"}`}
                      style={{ cursor: "pointer", border: "none", padding: "8px 18px", borderRadius: "20px", fontSize: "0.85rem" }}
                      onClick={() => setSelectedSeason(sNum)}
                    >
                      Сезон {sNum}
                    </button>
                  ))}
                </div>
              )}

              <div className="episode-popup-rows-list" style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
                {currentSeasonEpisodes.length > 0 ? (
                  currentSeasonEpisodes.map((ep) => (
                    <EpisodeSelectorRow
                      key={ep.id}
                      episodeItem={ep}
                      mediaType={mediaType}
                      backdropSrc={backdropSrc}
                      posterSrc={posterSrc}
                      onPlay={() => onPlay(ep, "default")}
                    />
                  ))
                ) : (
                  <div className="episode-popup-empty-files">
                    Нет доступных серий.
                  </div>
                )}
              </div>
            </div>
          )}

          {isSaving && (
            <div className="saving-overlay">
              <div className="saving-content">
                <div className="spinner" />
                <span>Сохранение смещения...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodeSelectorPopup;

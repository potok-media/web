import React from "react";
import type { TvSeason, TvEpisode } from "../network/ApiTypes";

interface TorrentOverridePickerProps {
  seasons: TvSeason[];
  seasonsLoading: boolean;
  onApplyOverride: (seasonNum: number, epNum: number) => void;
}

export const TorrentOverridePicker: React.FC<TorrentOverridePickerProps> = React.memo(({
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
    } catch (e) {
      return dateStr;
    }
  };

  if (seasonsLoading) {
    return (
      <div className="picker-loading-container">
        <div className="spinner picker-loading-spinner-wrap" />
        <span className="picker-loading-label">Загрузка сезонов...</span>
      </div>
    );
  }

  return (
    <div className="episode-picker-container">
      <h4 className="picker-header-title">С какой серии начинается эта раздача?</h4>
      {seasons.map((season) => {
        const seasonNum = season.seasonNumber ?? 1;
        const episodes = season.episodes ?? [];
        if (episodes.length === 0) return null;

        return (
          <div key={season.id || seasonNum} className="season-section">
            <h3 className="season-section-title">Сезон {seasonNum}</h3>
            <div className="episode-grid">
              {episodes.map((episode: TvEpisode) => {
                const epNum = episode.episodeNumber;
                const epName = episode.name || `Серия ${epNum}`;
                const epStill = episode.stillPath;
                const epAirDate = episode.airDate;

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

TorrentOverridePicker.displayName = "TorrentOverridePicker";
export default TorrentOverridePicker;

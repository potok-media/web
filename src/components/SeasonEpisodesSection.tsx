import React, { useEffect, useState } from "react";
import { ApiClient } from "../network/ApiClient";
import { useHUD } from "../context/HUDContext";
import type { TvEpisode } from "../network/ApiTypes";

interface SeasonEpisodesSectionProps {
  mediaId: number;
  numberOfSeasons: number;
  onEpisodeClick: (episode: TvEpisode, seasonNumber: number) => void;
}

export const SeasonEpisodesSection: React.FC<SeasonEpisodesSectionProps> = ({
  mediaId,
  numberOfSeasons,
  onEpisodeClick,
}) => {
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  const [loading, setLoading] = useState(false);
  const { show: showHUD } = useHUD();

  const fetchEpisodes = async (seasonNum: number) => {
    if (!mediaId) return;
    try {
      setLoading(true);
      const data = await ApiClient.fetchTvSeason(mediaId, seasonNum);
      const mappedEpisodes: TvEpisode[] = (data.episodes || []).map((ep) => ({
        id: ep.id,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        stillPath: ep.stillPath || ep.still_path,
        airDate: ep.airDate,
        seasonNumber: seasonNum,
      }));
      setEpisodes(mappedEpisodes);
    } catch {
      showHUD("error", "Не удалось загрузить эпизоды сезона");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes(activeSeason);
  }, [mediaId, activeSeason]);

  if (numberOfSeasons <= 0) return null;

  return (
    <section className="season-episodes-section">
      <h2 className="season-episodes-title">Выбор серий</h2>
      <div className="tabs-header">
        {Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map((sNum) => (
          <button
            key={sNum}
            className={`tab-btn ${activeSeason === sNum ? "active" : ""}`}
            onClick={() => setActiveSeason(sNum)}
          >
            Сезон {sNum}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="season-episodes-loading">
          <div className="spinner" />
        </div>
      ) : episodes.length > 0 ? (
        <div className="episodes-grid">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="episode-card"
              onClick={() => onEpisodeClick(ep, activeSeason)}
            >
              <div className="episode-still-wrap">
                <img
                  src={ep.stillPath || "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=280&h=157"}
                  alt={ep.name}
                  className="episode-still"
                  loading="lazy"
                />
              </div>
              <div className="episode-info">
                <span className="episode-number-title">
                  Серия {ep.episodeNumber}: {ep.name}
                </span>
                {ep.overview && <p className="episode-overview">{ep.overview}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="season-episodes-empty">
          Нет сведений об эпизодах этого сезона.
        </div>
      )}
    </section>
  );
};


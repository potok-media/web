import React from "react";
import { X } from "lucide-react";

interface PlayerTopBarProps {
  title: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  onClose: () => void;
  visible: boolean;
}

export const PlayerTopBar: React.FC<PlayerTopBarProps> = ({
  title,
  mediaType,
  season,
  episode,
  onClose,
  visible,
}) => {
  const isTv = mediaType === "tv";
  const hasSeasonEpisode = typeof season === "number" && typeof episode === "number";

  return (
    <div className={`player-top-bar ${visible ? "visible" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="player-meta-info">
        <h2 className="player-title">{title}</h2>
        {isTv && hasSeasonEpisode && (
          <span className="player-episode-info">
            Сезон {season}, Серия {episode}
          </span>
        )}
      </div>
      <button className="player-close-btn" onClick={onClose} aria-label="Закрыть плеер">
        <X size={20} />
      </button>
    </div>
  );
};

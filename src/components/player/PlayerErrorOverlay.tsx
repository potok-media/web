import React from "react";
import { AlertTriangle } from "lucide-react";

interface PlayerErrorOverlayProps {
  error: string;
  streamUrl: string;
  onRefresh: () => void;
  onClose: () => void;
}

export const PlayerErrorOverlay: React.FC<PlayerErrorOverlayProps> = ({
  error,
  streamUrl,
  onRefresh,
  onClose,
}) => {
  return (
    <div className="player-error-overlay" onClick={(e) => e.stopPropagation()}>
      <AlertTriangle size={48} />
      <h3 className="error-title">Ошибка воспроизведения</h3>
      <p className="error-message">{error}</p>
      <div className="error-details">Ссылка: <code>{streamUrl}</code></div>
      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button 
          className="error-close-btn" 
          style={{ background: "rgba(255, 255, 255, 0.15)", color: "#fff" }} 
          onClick={onRefresh}
        >
          Обновить поток
        </button>
        <button className="error-close-btn" onClick={onClose}>Закрыть плеер</button>
      </div>
    </div>
  );
};

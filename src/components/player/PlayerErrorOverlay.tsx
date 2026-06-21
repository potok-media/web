import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("player");
  return (
    <div className="player-error-overlay" onClick={(e) => e.stopPropagation()}>
      <AlertTriangle size={48} />
      <h3 className="error-title">{t("error.title")}</h3>
      <p className="error-message">{error}</p>
      <div className="error-details">{t("error.linkLabel")} <code>{streamUrl}</code></div>
      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button 
          className="error-close-btn" 
          style={{ background: "rgba(255, 255, 255, 0.15)", color: "#fff" }} 
          onClick={onRefresh}
        >
          {t("error.refreshStream")}
        </button>
        <button className="error-close-btn" onClick={onClose}>{t("error.closePlayer")}</button>
      </div>
    </div>
  );
};

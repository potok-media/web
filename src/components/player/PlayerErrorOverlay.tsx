import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui";

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
      <div className="player-error-actions">
        <Button variant="secondary" className="error-close-btn error-close-btn--refresh" onClick={onRefresh}>
          {t("error.refreshStream")}
        </Button>
        <Button variant="ghost" className="error-close-btn" onClick={onClose}>
          {t("error.closePlayer")}
        </Button>
      </div>
    </div>
  );
};
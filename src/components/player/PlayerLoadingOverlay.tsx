import React from "react";
import { useTranslation } from "react-i18next";

interface PlayerLoadingOverlayProps {
  loadingState: {
    title: string;
    subtitle: string;
    step: number;
  };
  onClose: () => void;
}

export const PlayerLoadingOverlay: React.FC<PlayerLoadingOverlayProps> = ({
  loadingState,
  onClose,
}) => {
  const { t } = useTranslation("player");
  return (
    <div className="player-loading-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="player-loading-card">
        <div className="player-loading-spinner-container">
          <div className="player-loading-spinner" />
          <div className="player-loading-spinner-inner" />
        </div>
        
        <h3 className="player-loading-title">{loadingState.title}</h3>
        <p className="player-loading-subtitle">{loadingState.subtitle}</p>

        {/* Premium Step Progress Tracker */}
        <div className="player-loading-steps">
          {[
            { step: 1, label: t("loading.steps.peers") },
            { step: 2, label: t("loading.steps.headers") },
            { step: 3, label: t("loading.steps.analyze") },
            { step: 4, label: t("loading.steps.buffering") }
          ].map((s) => {
            const isActive = loadingState.step === s.step;
            const isCompleted = loadingState.step > s.step;
            return (
              <div 
                key={s.step} 
                className={`player-loading-step-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              >
                <div className="step-dot">
                  {isCompleted ? "✓" : s.step}
                </div>
                <span className="step-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <button 
          className="player-loading-cancel-btn" 
          onClick={onClose}
        >
          {t("loading.cancel")}
        </button>
      </div>
    </div>
  );
};

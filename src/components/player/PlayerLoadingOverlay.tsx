import React from "react";

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
            { step: 1, label: "Поиск раздающих" },
            { step: 2, label: "Заголовки" },
            { step: 3, label: "Анализ медиа" },
            { step: 4, label: "Буферизация" }
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
          Отмена
        </button>
      </div>
    </div>
  );
};

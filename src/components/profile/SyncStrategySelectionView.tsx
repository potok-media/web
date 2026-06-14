import React from "react";
import { Popcorn, Server, ChevronRight } from "lucide-react";
import { FocusableButton } from "../common/TVNavigation";

interface SyncStrategySelectionViewProps {
  onSelectStrategy: (strategy: string) => void;
  onStartTraktAuth: () => void;
}

export const SyncStrategySelectionView: React.FC<SyncStrategySelectionViewProps> = ({
  onSelectStrategy,
  onStartTraktAuth,
}) => {
  return (
    <div className="strategy-card-wrapper selection-padding">
      <div className="strategy-selection-header">
        <h2 className="strategy-selection-title">
          Выберите способ синхронизации
        </h2>
        <p className="strategy-selection-desc">
          Синхронизируйте историю, запланированное и оценки между устройствами или храните всё на этом устройстве.
        </p>
      </div>

      <div className="strategy-options-list">
        <FocusableButton
          onClick={() => {
            onSelectStrategy("trakt");
            onStartTraktAuth();
          }}
          className="strategy-option-card trakt"
        >
          <div className="strategy-icon-badge trakt">
            <Popcorn size={18} />
          </div>
          <div className="strategy-option-info">
            <span className="strategy-option-title">Облако Trakt.tv</span>
            <span className="strategy-option-desc">
              Автоматически синхронизируйте историю просмотров, прогресс и запланированное с популярным сервисом Trakt.tv.
            </span>
          </div>
          <ChevronRight size={12} className="card-arrow strategy-option-arrow" />
        </FocusableButton>

        <FocusableButton
          onClick={() => onSelectStrategy("server")}
          className="strategy-option-card server"
        >
          <div className="strategy-icon-badge server">
            <Server size={18} />
          </div>
          <div className="strategy-option-info">
            <span className="strategy-option-title">Сервер Potok</span>
            <span className="strategy-option-desc">
              Синхронизация с вашим личным self-hosted сервером Potok (PostgreSQL). Полная приватность и поддержка нескольких учетных записей.
            </span>
          </div>
          <ChevronRight size={12} className="card-arrow strategy-option-arrow" />
        </FocusableButton>
      </div>
    </div>
  );
};

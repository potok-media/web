import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("profile");
  return (
    <div className="strategy-card-wrapper selection-padding">
      <div className="strategy-selection-header">
        <h2 className="strategy-selection-title">
          {t("strategySelection.title")}
        </h2>
        <p className="strategy-selection-desc">
          {t("strategySelection.description")}
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
            <span className="strategy-option-title">{t("strategySelection.trakt.title")}</span>
            <span className="strategy-option-desc">
              {t("strategySelection.trakt.description")}
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
            <span className="strategy-option-title">{t("strategySelection.server.title")}</span>
            <span className="strategy-option-desc">
              {t("strategySelection.server.description")}
            </span>
          </div>
          <ChevronRight size={12} className="card-arrow strategy-option-arrow" />
        </FocusableButton>
      </div>
    </div>
  );
};

import React from "react";
import { useTranslation } from "react-i18next";
import { Popcorn, Server, ChevronRight } from "lucide-react";
import { Pressable } from "../ui";


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
        <Pressable
          onPress={() => {
            onSelectStrategy("trakt");
            onStartTraktAuth();
          }}
          className="strategy-option-card trakt"
          role="button"
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
        </Pressable>

        <Pressable
          onPress={() => onSelectStrategy("server")}
          className="strategy-option-card server"
          role="button"
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
        </Pressable>
      </div>
    </div>
  );
};

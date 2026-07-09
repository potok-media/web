import React from "react";
import { useTranslation } from "react-i18next";
import { Chip, Select } from "../ui";

interface ProfileSyncStrategyControlsProps {
  syncStrategy: string;
  isMobile: boolean;
  traktConnected: boolean;
  onSelectStrategy: (strategy: string) => void;
  onStartTraktAuth: () => void;
}

export const ProfileSyncStrategyControls: React.FC<ProfileSyncStrategyControlsProps> = ({
  syncStrategy,
  isMobile,
  traktConnected,
  onSelectStrategy,
  onStartTraktAuth,
}) => {
  const { t } = useTranslation("profile");

  if (syncStrategy === "none" || syncStrategy === "localDevice") {
    return null;
  }

  if (isMobile) {
    return (
      <div className="profile-dropdown-wrap mobile-only">
        <div className="strategy-chips-container">
          <span className="strategy-chips-label">{t("page.syncLabel")}</span>
          <div className="strategy-segmented-chips">
            <Chip
              active={syncStrategy === "none"}
              className="strategy-chip-btn"
              onClick={() => onSelectStrategy("none")}
            >
              {t("page.chip.off")}
            </Chip>
            <Chip
              active={syncStrategy === "trakt"}
              className="strategy-chip-btn"
              onClick={() => {
                onSelectStrategy("trakt");
                if (!traktConnected) onStartTraktAuth();
              }}
            >
              Trakt.tv
            </Chip>
            <Chip
              active={syncStrategy === "server"}
              className="strategy-chip-btn"
              onClick={() => onSelectStrategy("server")}
            >
              {t("page.strategyLabel.server")}
            </Chip>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-dropdown-wrap desktop-only">
      <div className="strategy-dropdown-container">
        <span>{t("page.syncLabel")}</span>
        <Select
          value={syncStrategy}
          onChange={onSelectStrategy}
          className="strategy-dropdown-select"
          options={[
            { value: "none", label: t("page.dropdown.none") },
            { value: "trakt", label: "Trakt.tv" },
            { value: "server", label: t("page.strategyLabel.server") },
          ]}
        />
      </div>
    </div>
  );
};
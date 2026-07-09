import React from "react";
import { useTranslation } from "react-i18next";
import { Popcorn } from "lucide-react";
import { Button } from "../ui";

interface TraktConnectCardProps {
  loadingTrakt: boolean;
  onConnect: () => void;
}

export const TraktConnectCard: React.FC<TraktConnectCardProps> = ({
  loadingTrakt,
  onConnect,
}) => {
  const { t } = useTranslation("profile");

  return (
    <div className="strategy-card-wrapper trakt-connect">
      <div className="profile-trakt-icon-container">
        <Popcorn size="2rem" />
      </div>
      <div>
        <h3 className="profile-trakt-sync-title">{t("page.traktConnect.title")}</h3>
        <p className="profile-trakt-sync-desc">
          {t("page.traktConnect.description")}
        </p>
      </div>
      <Button variant="accent" className="profile-trakt-connect-btn" onClick={onConnect} disabled={loadingTrakt}>
        {loadingTrakt ? t("page.traktConnect.loading") : t("page.traktConnect.connectButton")}
      </Button>
    </div>
  );
};
import React from "react";
import { useTranslation } from "react-i18next";
import { Server } from "lucide-react";
import type { ConnectionState } from "../context/AppSettingsContext";
import type { ConnectionProfile } from "../network/ApiTypes";
import { Button, Input } from "./ui";

interface OfflineOverlayProps {
  connectionState: ConnectionState;
  inputUrl: string;
  setInputUrl: (val: string) => void;
  handleSaveAndConnect: (e: React.FormEvent) => void;
  activeProfile: ConnectionProfile | null;
  checkConnection: () => void;
}

export const OfflineOverlay: React.FC<OfflineOverlayProps> = ({
  connectionState,
  inputUrl,
  setInputUrl,
  handleSaveAndConnect,
  activeProfile,
  checkConnection,
}) => {
  const { t } = useTranslation("connection");

  if (
    connectionState !== "checking" &&
    connectionState !== "setupRequired" &&
    connectionState !== "offline"
  ) {
    return null;
  }

  const isChecking = connectionState === "checking";
  const isOffline = connectionState === "offline";

  return (
    <div className="overlay-screen">
      <div className="conn-card">
        <div className={`conn-icon${isOffline ? " conn-icon--error" : ""}`}>
          {isChecking ? <span className="spinner" /> : <Server size="1.75rem" />}
        </div>

        <h2 className={`conn-title${isOffline ? " conn-title--error" : ""}`}>
          {t(isChecking ? "checking.title" : isOffline ? "offline.title" : "setup.title")}
        </h2>

        <p className="conn-desc">
          {isChecking && t("checking.subtitle")}
          {connectionState === "setupRequired" && t("setup.hint")}
          {isOffline && (
            <>
              {t("offline.cantReach")}
              <span className="conn-desc-addr">{activeProfile?.gatewayURL}</span>
            </>
          )}
        </p>

        {!isChecking && (
          <form onSubmit={handleSaveAndConnect} className="conn-form">
            <label className="conn-field-label">{t("bffPlaceholder")}</label>
            <div className="conn-input-row">
              <Input
                type="text"
                className="conn-input"
                placeholder={t("bffPlaceholder")}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" className="conn-connect">
                {t("connect")}
              </Button>
            </div>
            <span className="conn-example">{t("example")}</span>

            {isOffline && (
              <Button type="button" variant="ghost" className="conn-retry-link" onClick={() => checkConnection()}>
                {t("checkAgain")}
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { useTranslation } from "react-i18next";
import type { ConnectionState } from "../context/AppSettingsContext";
import type { ConnectionProfile } from "../network/ApiTypes";

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
  checkConnection
}) => {
  const { t } = useTranslation("connection");

  if (connectionState === "checking") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content">
          <div className="spinner" />
          <h2 className="overlay-title">{t("checking.title")}</h2>
          <p className="overlay-text">{t("checking.subtitle")}</p>
        </div>
      </div>
    );
  }

  if (connectionState === "setupRequired") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content compact">
          <h2 className="overlay-title">{t("setup.title")}</h2>
          <p className="overlay-text">{t("setup.hint")}</p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form">
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder={t("bffPlaceholder")}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              {t("saveAndConnect")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (connectionState === "offline") {
    return (
      <div className="overlay-screen">
        <div className="overlay-content compact">
          <h2 className="overlay-title error">{t("offline.title")}</h2>
          <p className="overlay-text">
            {t("offline.cantReach")} <strong>{activeProfile?.gatewayURL}</strong>
          </p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form offline">
            <label className="settings-label overlay-label">{t("offline.otherAddress")}</label>
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder={t("bffPlaceholder")}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              {t("applyRetry")}
            </button>
          </form>

          <button
            type="button"
            className="overlay-btn secondary"
            onClick={() => checkConnection()}
          >
            {t("checkAgain")}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

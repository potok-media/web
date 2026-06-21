import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ConnectionState } from "../context/AppSettingsContext";
import type { ConnectionProfile } from "../network/ApiTypes";
import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { FocusableButton, FocusableInput, FocusableContainer } from "./common/TVNavigation";

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
  // TV: default focus on the URL input / first control when an interactive state is shown
  useEffect(() => {
    if (connectionState === "setupRequired" || connectionState === "offline") {
      const t = setTimeout(() => {
        setFocus("OFFLINE_OVERLAY_INPUT");
      }, 60);
      return () => clearTimeout(t);
    }
  }, [connectionState]);

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
        <FocusableContainer focusKey="OFFLINE_OVERLAY" isFocusBoundary className="overlay-content compact">
          <h2 className="overlay-title">{t("setup.title")}</h2>
          <p className="overlay-text">{t("setup.hint")}</p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form">
            <FocusableInput
              focusKey="OFFLINE_OVERLAY_INPUT"
              type="text"
              className="settings-input overlay-input"
              placeholder={t("bffPlaceholder")}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <FocusableButton type="submit" className="overlay-btn wide">
              {t("saveAndConnect")}
            </FocusableButton>
          </form>
        </FocusableContainer>
      </div>
    );
  }

  if (connectionState === "offline") {
    return (
      <div className="overlay-screen">
        <FocusableContainer focusKey="OFFLINE_OVERLAY" isFocusBoundary className="overlay-content compact">
          <h2 className="overlay-title error">{t("offline.title")}</h2>
          <p className="overlay-text">
            {t("offline.cantReach")} <strong>{activeProfile?.gatewayURL}</strong>
          </p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form offline">
            <label className="settings-label overlay-label">{t("offline.otherAddress")}</label>
            <FocusableInput
              focusKey="OFFLINE_OVERLAY_INPUT"
              type="text"
              className="settings-input overlay-input"
              placeholder={t("bffPlaceholder")}
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <FocusableButton type="submit" className="overlay-btn wide">
              {t("applyRetry")}
            </FocusableButton>
          </form>

          <FocusableButton
            type="button"
            className="overlay-btn secondary"
            onClick={() => checkConnection()}
          >
            {t("checkAgain")}
          </FocusableButton>
        </FocusableContainer>
      </div>
    );
  }

  return null;
};

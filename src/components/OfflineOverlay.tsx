import React, { useEffect } from "react";
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
          <h2 className="overlay-title">Подключение к Potok...</h2>
          <p className="overlay-text">Опрашиваем шлюз API Gateway шлюза</p>
        </div>
      </div>
    );
  }

  if (connectionState === "setupRequired") {
    return (
      <div className="overlay-screen">
        <FocusableContainer focusKey="OFFLINE_OVERLAY" isFocusBoundary className="overlay-content compact">
          <h2 className="overlay-title">Требуется настройка</h2>
          <p className="overlay-text">Укажите адрес BFF-шлюза (API Gateway) для связи с сервером Potok:</p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form">
            <FocusableInput
              focusKey="OFFLINE_OVERLAY_INPUT"
              type="text"
              className="settings-input overlay-input"
              placeholder="Адрес до BFF-шлюза"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <FocusableButton type="submit" className="overlay-btn wide">
              Сохранить и подключиться
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
          <h2 className="overlay-title error">Сервер Potok недоступен</h2>
          <p className="overlay-text">
            Не удалось соединиться по адресу: <strong>{activeProfile?.gatewayURL}</strong>
          </p>

          <form onSubmit={handleSaveAndConnect} className="overlay-form offline">
            <label className="settings-label overlay-label">Указать другой адрес BFF:</label>
            <FocusableInput
              focusKey="OFFLINE_OVERLAY_INPUT"
              type="text"
              className="settings-input overlay-input"
              placeholder="Адрес до BFF-шлюза"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <FocusableButton type="submit" className="overlay-btn wide">
              Применить и повторить попытку
            </FocusableButton>
          </form>

          <FocusableButton
            type="button"
            className="overlay-btn secondary"
            onClick={() => checkConnection()}
          >
            Проверить снова
          </FocusableButton>
        </FocusableContainer>
      </div>
    );
  }

  return null;
};

import React from "react";
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
        <div className="overlay-content compact">
          <h2 className="overlay-title">Требуется настройка</h2>
          <p className="overlay-text">Укажите адрес BFF-шлюза (API Gateway) для связи с сервером Potok:</p>
          
          <form onSubmit={handleSaveAndConnect} className="overlay-form">
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder="Адрес до BFF-шлюза"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              Сохранить и подключиться
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
          <h2 className="overlay-title error">Сервер Potok недоступен</h2>
          <p className="overlay-text">
            Не удалось соединиться по адресу: <strong>{activeProfile?.gatewayURL}</strong>
          </p>
          
          <form onSubmit={handleSaveAndConnect} className="overlay-form offline">
            <label className="settings-label overlay-label">Указать другой адрес BFF:</label>
            <input
              type="text"
              className="settings-input overlay-input"
              placeholder="Адрес до BFF-шлюза"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
            />
            <button type="submit" className="overlay-btn wide">
              Применить и повторить попытку
            </button>
          </form>
          
          <button
            type="button"
            className="overlay-btn secondary"
            onClick={() => checkConnection()}
          >
            Проверить снова
          </button>
        </div>
      </div>
    );
  }

  return null;
};

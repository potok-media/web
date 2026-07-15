import React from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import type { ActivePlayback } from "../../context/playbackTypes";
import type { ConnectionState } from "../../context/AppSettingsContext";
import type { ConnectionProfile } from "../../network/ApiTypes";
import { WebMediaPlayer } from "../WebMediaPlayer";
import { ErrorBoundary } from "../ErrorBoundary";
import { OfflineOverlay } from "../OfflineOverlay";
import { FocusTrap } from "../common/FocusTrap";
import { Button } from "../ui";

interface AppLayoutPlayerOverlayProps {
  activePlayback: ActivePlayback | null;
  connectionState: ConnectionState;
  onClosePlayer: () => void;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  handleSaveAndConnect: (e: React.FormEvent) => void;
  activeProfile: ConnectionProfile | null;
  checkConnection: () => void;
}

export const AppLayoutPlayerOverlay: React.FC<AppLayoutPlayerOverlayProps> = ({
  activePlayback,
  connectionState,
  onClosePlayer,
  inputUrl,
  setInputUrl,
  handleSaveAndConnect,
  activeProfile,
  checkConnection,
}) => {
  const { t } = useTranslation("common");

  return (
    <>
      {activePlayback && (
        <ErrorBoundary fallback={(error, resetError) => (
          <div className="player-error-fallback player-error-fallback--toast">
            <h4 className="player-error-fallback__title">{t("playerError")}</h4>
            <p className="player-error-fallback__text">
              {error.message || t("playbackFailed")}
            </p>
            <div className="player-error-fallback__actions">
              <Button variant="danger" size="sm" fullWidth onClick={resetError}>
                {t("actions.retry")}
              </Button>
              <Button variant="secondary" size="sm" fullWidth onClick={onClosePlayer}>
                {t("actions.close")}
              </Button>
            </div>
          </div>
        )}>
          <WebMediaPlayer
            key={activePlayback.instanceId ?? activePlayback.id}
            playback={activePlayback}
            onClose={onClosePlayer}
            isNetworkOffline={connectionState === "offline"}
          />
        </ErrorBoundary>
      )}

      {connectionState !== "connected" && ReactDOM.createPortal(
        <FocusTrap>
          <OfflineOverlay
            connectionState={connectionState}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            handleSaveAndConnect={handleSaveAndConnect}
            activeProfile={activeProfile}
            checkConnection={checkConnection}
          />
        </FocusTrap>,
        document.body,
      )}
    </>
  );
};
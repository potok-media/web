import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { AuthApiClient } from "../../network/AuthApiClient";
import { useHUD } from "../../context/useHUD";
import { useAuth } from "../../context/AppSettingsContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useTraktAuth } from "../../hooks/useTraktAuth";
import { SyncStrategySelectionView } from "./SyncStrategySelectionView";
import { ServerSyncActiveView } from "./ServerSyncActiveView";
import { TraktDeviceAuthView } from "./TraktDeviceAuthView";
import { TraktActiveView } from "./TraktActiveView";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileSyncStrategyControls } from "./ProfileSyncStrategyControls";
import { TraktConnectCard } from "./TraktConnectCard";
import { ProfileMobileExtensions } from "./ProfileMobileExtensions";
import { Button } from "../ui";

/** Account + sync content of the profile page, moved into the "Аккаунт" tab unchanged. */
export const ProfileAccountSection: React.FC = () => {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const {
    potokToken,
    potokUser,
    logout,
    syncStrategy,
    traktConnected,
    setSyncStrategy,
  } = useAuth();

  const isMobile = useIsMobile();
  const {
    traktProfile,
    deviceCode,
    loadingTrakt,
    startTraktAuth,
    handleTraktLogout,
    setDeviceCode,
    copyToClipboard,
    clearTraktState,
  } = useTraktAuth(syncStrategy);

  const handlePotokLogout = () => {
    logout();
    clearTraktState();
    showHUD("info", t("hud.loggedOut"));
  };

  const selectStrategy = async (strategy: string) => {
    setSyncStrategy(strategy);
    if (potokToken) {
      try {
        await AuthApiClient.updateSyncStrategy(strategy);
      } catch {
        showHUD("error", t("hud.strategyUpdateFailed"));
      }
    }
  };

  return (
    <>
      <ProfileHeader
        username={potokUser?.username}
        syncStrategy={syncStrategy}
        onLogout={handlePotokLogout}
      />

      <ProfileSyncStrategyControls
        syncStrategy={syncStrategy}
        isMobile={isMobile}
        traktConnected={traktConnected}
        onSelectStrategy={selectStrategy}
        onStartTraktAuth={startTraktAuth}
      />

      {syncStrategy === "localDevice" && (
        <div className="strategy-card-wrapper profile-warning-card">
          <h3 className="profile-warning-title">{t("page.localWarning.title")}</h3>
          <p className="profile-warning-text">
            {t("page.localWarning.text")}
          </p>
          <div className="profile-warning-buttons">
            <Button variant="accent" className="profile-btn-caption-bold" onClick={() => selectStrategy("server")}>{t("page.localWarning.serverButton")}</Button>
            <Button variant="glass" className="profile-btn-caption-bold" onClick={() => { selectStrategy("trakt"); startTraktAuth(); }}>{t("page.localWarning.traktButton")}</Button>
          </div>
        </div>
      )}

      {(syncStrategy === "none" || syncStrategy === "localDevice") && (
        <SyncStrategySelectionView onSelectStrategy={selectStrategy} onStartTraktAuth={startTraktAuth} />
      )}

      {syncStrategy === "trakt" && (
        <>
          {traktConnected && traktProfile ? (
            <TraktActiveView traktProfile={traktProfile} onLogout={handleTraktLogout} />
          ) : deviceCode ? (
            <TraktDeviceAuthView
              deviceCode={deviceCode}
              onCancel={() => setDeviceCode(null)}
              onCopyCode={() => copyToClipboard(deviceCode.user_code)}
            />
          ) : traktConnected && loadingTrakt ? (
            <div className="profile-loading-wrap">
              <RefreshCw className="spin profile-loading-spinner" size="2rem" />
            </div>
          ) : (
            <TraktConnectCard loadingTrakt={loadingTrakt} onConnect={startTraktAuth} />
          )}
        </>
      )}

      {syncStrategy === "server" && <ServerSyncActiveView />}

      {isMobile && <ProfileMobileExtensions />}
    </>
  );
};

export default ProfileAccountSection;

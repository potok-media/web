import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, RefreshCw, Popcorn, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { AuthApiClient } from "../network/AuthApiClient";
import { Slot } from "../components/common/extension/Slot";
import { useHUD } from "../context/HUDContext";
import { useAuth } from "../context/AppSettingsContext";
import { restoreFocusOrDefault } from "../utils/focusMemory";
import { FocusableButton } from "../components/common/TVNavigation";
import { useIsMobile } from "../hooks/useIsMobile";
import { SyncStrategySelectionView } from "../components/profile/SyncStrategySelectionView";
import { ServerSyncActiveView } from "../components/profile/ServerSyncActiveView";
import { TraktDeviceAuthView } from "../components/profile/TraktDeviceAuthView";
import { TraktActiveView } from "../components/profile/TraktActiveView";
import { PotokAuthView } from "../components/profile/PotokAuthView";
import { ApiError } from "../network/ApiTypes";
import type { TraktProfile, DeviceCodeResponse } from "../network/ApiTypes";
import "../styles/profile.css";

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation("profile");
  const { show: showHUD } = useHUD();
  const location = useLocation();
  const {
    potokToken,
    potokUser,
    login,
    logout,
    syncStrategy,
    traktConnected,
    setSyncStrategy,
    setTraktConnected
  } = useAuth();

  const [traktProfile, setTraktProfile] = useState<TraktProfile | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);
  const isMobile = useIsMobile();


  const pollingRef = useRef<any>(null);

  const handlePotokLogout = () => {
    logout();
    setTraktProfile(null);
    setDeviceCode(null);
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

  const startTraktAuth = async () => {
    setLoadingTrakt(true);
    try {
      const code: DeviceCodeResponse = await AuthApiClient.getTraktDeviceCode();
      setDeviceCode(code);
    } catch {
      showHUD("error", t("hud.traktCodeError"));
    } finally {
      setLoadingTrakt(false);
    }
  };

  const pollTraktToken = async (codeVal: string) => {
    try {
      const data = await AuthApiClient.getTraktToken(codeVal);
      if (data.access_token) {
        setTraktConnected(true);
        setDeviceCode(null);
        showHUD("success", t("hud.traktConnected"));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== "UNAUTHORIZED") {
        setDeviceCode(null);
        showHUD("error", t("hud.codeExpired"));
      }
    }
  };

  const fetchTraktProfileData = async () => {
    setLoadingTrakt(true);
    try {
      const data: TraktProfile = await AuthApiClient.fetchTraktProfile();
      setTraktProfile(data);
    } catch (err) {
      setTraktProfile(null);
      if (err instanceof ApiError && err.status === 401) {
        setTraktConnected(false);
      }
    } finally {
      setLoadingTrakt(false);
    }
  };

  const handleTraktLogout = async () => {
    try {
      await AuthApiClient.traktLogout();
    } catch {}
    setTraktConnected(false);
    setTraktProfile(null);
    showHUD("info", t("hud.traktDisconnected"));
  };

  useEffect(() => {
    if (deviceCode) {
      pollingRef.current = setInterval(() => {
        pollTraktToken(deviceCode.device_code);
      }, (deviceCode.interval || 5) * 1000);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [deviceCode]);

  useEffect(() => {
    if (syncStrategy === "trakt" && traktConnected) {
      fetchTraktProfileData();
    }
  }, [syncStrategy, traktConnected]);

  useEffect(() => {
    const def = potokToken ? "PROFILE_LOGOUT_BTN" : "AUTH_USERNAME_INPUT";
    restoreFocusOrDefault(location.key || location.pathname, def);
  }, [potokToken, location.key, location.pathname]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showHUD("success", t("hud.codeCopied"));
  };

  if (!potokToken) {
    return (
      <div className="profile-auth-screen-container">
        <PotokAuthView onSuccess={(data) => {
          login(data.token, data.user);
        }} />
      </div>
    );
  }

  const profileContent = (
    <div className="profile-container">
      <div className="profile-header-wrap">
        <div>
          <div className="profile-title-row">
            <h1 className="profile-hero-title">{t("page.title")}</h1>
            <Link to="/settings" className="profile-mobile-settings-btn" title={t("page.settings")}>
              <Settings size="1.25rem" />
            </Link>
          </div>
          <span className="profile-subtitle">
            {t("page.subtitle")}
          </span>
        </div>
        <div className="profile-user-card profile-shrink-zero">
          <div className="profile-avatar">
            {potokUser?.username?.substring(0, 1).toUpperCase() || "U"}
          </div>
          <div>
            <div className="profile-username-label">
              {potokUser?.username || t("page.defaultUser")}
            </div>
            <div className="profile-strategy-label">
              {syncStrategy === "trakt" ? t("page.strategyLabel.trakt") : syncStrategy === "server" ? t("page.strategyLabel.server") : t("page.strategyLabel.none")}
            </div>
          </div>
          <FocusableButton
            focusKey="PROFILE_LOGOUT_BTN"
            onClick={handlePotokLogout}
            className="profile-logout-btn"
            title={t("page.logout")}
          >
            <LogOut size="1rem" />
          </FocusableButton>
        </div>
      </div>

      {syncStrategy !== "none" && syncStrategy !== "localDevice" && (
        isMobile ? (
          /* Segmented chips — focusable, used on mobile (a native <select>
             can't be reached by the D-pad). */
          <div className="profile-dropdown-wrap mobile-only">
            <div className="strategy-chips-container">
              <span className="strategy-chips-label">{t("page.syncLabel")}</span>
              <div className="strategy-segmented-chips">
                <FocusableButton
                  onClick={() => selectStrategy("none")}
                  className={`strategy-chip-btn ${syncStrategy === "none" ? "active" : ""}`}
                >
                  {t("page.chip.off")}
                </FocusableButton>
                <FocusableButton
                  onClick={() => {
                    selectStrategy("trakt");
                    if (!traktConnected) startTraktAuth();
                  }}
                  className={`strategy-chip-btn ${syncStrategy === "trakt" ? "active" : ""}`}
                >
                  Trakt.tv
                </FocusableButton>
                <FocusableButton
                  onClick={() => selectStrategy("server")}
                  className={`strategy-chip-btn ${syncStrategy === "server" ? "active" : ""}`}
                >
                  {t("page.strategyLabel.server")}
                </FocusableButton>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop sync select dropdown */
          <div className="profile-dropdown-wrap desktop-only">
            <div className="strategy-dropdown-container">
              <span>{t("page.syncLabel")}</span>
              <select
                value={syncStrategy}
                onChange={(e) => selectStrategy(e.target.value)}
                className="strategy-dropdown-select"
              >
                <option value="none">{t("page.dropdown.none")}</option>
                <option value="trakt">Trakt.tv</option>
                <option value="server">{t("page.strategyLabel.server")}</option>
              </select>
            </div>
          </div>
        )
      )}

      {syncStrategy === "localDevice" && (
        <div className="strategy-card-wrapper profile-warning-card">
          <h3 className="profile-warning-title">{t("page.localWarning.title")}</h3>
          <p className="profile-warning-text">
            {t("page.localWarning.text")}
          </p>
          <div className="profile-warning-buttons">
            <FocusableButton onClick={() => selectStrategy("server")} className="btn-accent profile-btn-caption-bold">{t("page.localWarning.serverButton")}</FocusableButton>
            <FocusableButton onClick={() => { selectStrategy("trakt"); startTraktAuth(); }} className="btn-glass profile-btn-caption-bold">{t("page.localWarning.traktButton")}</FocusableButton>
          </div>
        </div>
      )}

      {(syncStrategy === "none" || syncStrategy === "localDevice") && (
        <SyncStrategySelectionView onSelectStrategy={selectStrategy} onStartTraktAuth={startTraktAuth} />
      )}

      {syncStrategy === "trakt" && (
        <>
          {traktConnected ? (
            <>
              {traktProfile ? (
                <TraktActiveView traktProfile={traktProfile} onLogout={handleTraktLogout} />
              ) : (
                <div className="profile-loading-wrap">
                  <RefreshCw className="spin profile-loading-spinner" size="2rem" />
                </div>
              )}
            </>
          ) : deviceCode ? (
            <TraktDeviceAuthView
              deviceCode={deviceCode}
              onCancel={() => setDeviceCode(null)}
              onCopyCode={() => copyToClipboard(deviceCode.user_code)}
            />
          ) : (
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
              <FocusableButton onClick={startTraktAuth} className="btn-accent profile-trakt-connect-btn" disabled={loadingTrakt}>
                {loadingTrakt ? t("page.traktConnect.loading") : t("page.traktConnect.connectButton")}
              </FocusableButton>
            </div>
          )}
        </>
      )}

      {syncStrategy === "server" && <ServerSyncActiveView />}

      {/* Mobile-only: the desktop sidebar already exposes these plugin slots, so
          mounting them here on desktop/TV would duplicate the slot subtrees. */}
      {isMobile && (
        <div className="profile-mobile-extensions-section">
          <h2 className="profile-extensions-heading">{t("page.extensions.heading")}</h2>
          <p className="profile-extensions-subheading">{t("page.extensions.subheading")}</p>
          <div className="profile-extensions-grid-wrapper">
            <Slot name="sidebar-menu-home" props={{ isCollapsed: false }} style={{ marginBottom: "0.5rem" }} />
            <Slot name="sidebar-menu-library" props={{ isCollapsed: false }} style={{ marginBottom: "0.5rem" }} />
            <Slot name="sidebar-menu" props={{ isCollapsed: false }} />
          </div>
        </div>
      )}
    </div>
  );

  return profileContent;
};

export default ProfilePage;

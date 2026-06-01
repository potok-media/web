import React, { useState, useEffect, useRef } from "react";
import { LogOut, RefreshCw, Popcorn, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { ExtensionSlot } from "../components/common/ExtensionSlot";
import { Storage } from "../utils/StorageService";
import { AuthApiClient } from "../network/AuthApiClient";
import { useHUD } from "../context/HUDContext";
import { useAuth } from "../context/AppSettingsContext";
import { SyncStrategySelectionView } from "../components/profile/SyncStrategySelectionView";
import { ServerSyncActiveView } from "../components/profile/ServerSyncActiveView";
import { TraktDeviceAuthView } from "../components/profile/TraktDeviceAuthView";
import { TraktActiveView } from "../components/profile/TraktActiveView";
import { PotokAuthView } from "../components/profile/PotokAuthView";
import type { TraktProfile, DeviceCodeResponse } from "../network/ApiTypes";
import "../styles/profile.css";

export const ProfilePage: React.FC = () => {
  const { show: showHUD } = useHUD();
  const { potokToken, potokUser, login, logout } = useAuth();
  const [syncStrategy, setSyncStrategy] = useState<string>(() => Storage.get("syncStrategy", "none"));
  const [traktToken, setTraktToken] = useState<string | null>(() => Storage.get("traktAccessToken", null));

  const [traktProfile, setTraktProfile] = useState<TraktProfile | null>(null);
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);

  const pollingRef = useRef<any>(null);

  const handlePotokLogout = () => {
    logout();
    setSyncStrategy("none");
    setTraktToken(null);
    setTraktProfile(null);
    setDeviceCode(null);
    showHUD("info", "Вы вышли из аккаунта");
  };

  const selectStrategy = async (strategy: string) => {
    Storage.set("syncStrategy", strategy);
    setSyncStrategy(strategy);
    if (potokToken) {
      try {
        await AuthApiClient.updateSyncStrategy(strategy);
      } catch {
        showHUD("error", "Не удалось обновить стратегию на сервере");
      }
    }
  };

  const startTraktAuth = async () => {
    setLoadingTrakt(true);
    try {
      const code: DeviceCodeResponse = await AuthApiClient.getTraktDeviceCode();
      setDeviceCode(code);
    } catch {
      showHUD("error", "Ошибка при получении кода Trakt");
    } finally {
      setLoadingTrakt(false);
    }
  };

  const pollTraktToken = async (codeVal: string) => {
    try {
      const data = await AuthApiClient.getTraktToken(codeVal);
      if (data.access_token) {
        Storage.set("traktAccessToken", data.access_token);
        setTraktToken(data.access_token);
        setDeviceCode(null);
        showHUD("success", "Trakt.tv подключен!");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== "UNAUTHORIZED") {
        setDeviceCode(null);
        showHUD("error", "Срок действия кода истек");
      }
    }
  };

  const fetchTraktProfileData = async () => {
    setLoadingTrakt(true);
    try {
      const data: TraktProfile = await AuthApiClient.fetchTraktProfile();
      setTraktProfile(data);
    } catch {
      setTraktProfile(null);
    } finally {
      setLoadingTrakt(false);
    }
  };

  const handleTraktLogout = async () => {
    try {
      await AuthApiClient.traktLogout();
    } catch {}
    Storage.remove("traktAccessToken");
    setTraktToken(null);
    setTraktProfile(null);
    showHUD("info", "Trakt.tv отключен");
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
    if (syncStrategy === "trakt" && traktToken) {
      fetchTraktProfileData();
    }
  }, [syncStrategy, traktToken]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showHUD("success", "Код скопирован");
  };

  if (!potokToken) {
    return (
      <div className="profile-auth-screen-container">
        <PotokAuthView onSuccess={(data) => {
          Storage.set("potokToken", data.token);
          Storage.set("potokUser", data.user);
          Storage.set("syncStrategy", data.user.syncStrategy);
          if (data.user.traktAccessToken) {
            Storage.set("traktAccessToken", data.user.traktAccessToken);
          } else {
            Storage.remove("traktAccessToken");
          }
          setSyncStrategy(data.user.syncStrategy);
          setTraktToken(data.user.traktAccessToken || null);
          login(data.token, data.user);
        }} />
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header-wrap">
        <div>
          <div className="profile-title-row">
            <h1 className="profile-hero-title">Профиль</h1>
            <Link to="/settings" className="profile-mobile-settings-btn" title="Настройки">
              <Settings size={20} />
            </Link>
          </div>
          <span className="profile-subtitle">
            Управление аккаунтами и синхронизацией
          </span>
        </div>
        <div className="profile-user-card profile-shrink-zero">
          <div className="profile-avatar">
            {potokUser?.username?.substring(0, 1).toUpperCase() || "U"}
          </div>
          <div>
            <div className="profile-username-label">
              {potokUser?.username || "Пользователь"}
            </div>
            <div className="profile-strategy-label">
              {syncStrategy === "trakt" ? "Облако Trakt.tv" : syncStrategy === "server" ? "Сервер Potok" : "Синхронизация отключена"}
            </div>
          </div>
          <button onClick={handlePotokLogout} className="profile-logout-btn" title="Выйти">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {syncStrategy !== "none" && syncStrategy !== "localDevice" && (
        <>
          {/* Desktop sync select dropdown */}
          <div className="profile-dropdown-wrap desktop-only">
            <div className="strategy-dropdown-container">
              <span>Синхронизация:</span>
              <select
                value={syncStrategy}
                onChange={(e) => selectStrategy(e.target.value)}
                className="strategy-dropdown-select"
              >
                <option value="none">Не выбрано</option>
                <option value="trakt">Trakt.tv</option>
                <option value="server">Сервер Potok</option>
              </select>
            </div>
          </div>

          {/* Mobile premium strategy segmented chips */}
          <div className="profile-dropdown-wrap mobile-only">
            <div className="strategy-chips-container">
              <span className="strategy-chips-label">Синхронизация:</span>
              <div className="strategy-segmented-chips">
                <button
                  type="button"
                  onClick={() => selectStrategy("none")}
                  className={`strategy-chip-btn ${syncStrategy === "none" ? "active" : ""}`}
                >
                  Выкл
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectStrategy("trakt");
                    if (!traktToken) startTraktAuth();
                  }}
                  className={`strategy-chip-btn ${syncStrategy === "trakt" ? "active" : ""}`}
                >
                  Trakt.tv
                </button>
                <button
                  type="button"
                  onClick={() => selectStrategy("server")}
                  className={`strategy-chip-btn ${syncStrategy === "server" ? "active" : ""}`}
                >
                  Сервер Potok
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {syncStrategy === "localDevice" && (
        <div className="strategy-card-wrapper profile-warning-card">
          <h3 className="profile-warning-title">Локальный режим не поддерживается на веб-клиенте</h3>
          <p className="profile-warning-text">
            В браузере оффлайн-кэш нестабилен и легко стирается. Пожалуйста, переключитесь на облачную синхронизацию Trakt.tv или Сервер Potok для сохранности вашей истории.
          </p>
          <div className="profile-warning-buttons">
            <button onClick={() => selectStrategy("server")} className="btn-accent profile-btn-caption-bold">Синхронизация на server</button>
            <button onClick={() => { selectStrategy("trakt"); startTraktAuth(); }} className="btn-glass profile-btn-caption-bold">Синхронизация Trakt.tv</button>
          </div>
        </div>
      )}

      {(syncStrategy === "none" || syncStrategy === "localDevice") && (
        <SyncStrategySelectionView onSelectStrategy={selectStrategy} onStartTraktAuth={startTraktAuth} />
      )}

      {syncStrategy === "trakt" && (
        <>
          {traktToken ? (
            <>
              {traktProfile ? (
                <TraktActiveView traktProfile={traktProfile} onLogout={handleTraktLogout} />
              ) : (
                <div className="profile-loading-wrap">
                  <RefreshCw className="spin profile-loading-spinner" size={32} />
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
                <Popcorn size={32} />
              </div>
              <div>
                <h3 className="profile-trakt-sync-title">Синхронизация с Trakt.tv</h3>
                <p className="profile-trakt-sync-desc">
                  Подключите свой аккаунт для облачной синхронизации истории и оценок.
                </p>
              </div>
              <button onClick={startTraktAuth} className="btn-accent profile-trakt-connect-btn" disabled={loadingTrakt}>
                {loadingTrakt ? "Загрузка..." : "Подключить аккаунт"}
              </button>
            </div>
          )}
        </>
      )}

      {syncStrategy === "server" && <ServerSyncActiveView />}

      <div className="profile-mobile-extensions-section">
        <h2 className="profile-extensions-heading">Ваши расширения и инструменты</h2>
        <p className="profile-extensions-subheading">Быстрый доступ к установленным плагинам</p>
        <div className="profile-extensions-grid-wrapper">
          <ExtensionSlot name="sidebar-menu" props={{ isCollapsed: false }} />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

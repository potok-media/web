import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link2Off,
  Loader2,
  Paperclip,
  Popcorn,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/useHUD";
import { useTraktAuth } from "../../hooks/useTraktAuth";
import { AuthApiClient } from "../../network/AuthApiClient";
import { Overlay } from "../common/Overlay";
import { TelegramStartAuthButton } from "../profile/TelegramStartAuthButton";
import { TraktDeviceAuthView } from "../profile/TraktDeviceAuthView";
import { Button, IconButton } from "../ui";
import { SettingsCard } from "./SettingsCard";

export const ConnectedAccountsSettings: React.FC = () => {
  const { t } = useTranslation("settings");
  const { show: showHUD } = useHUD();
  const {
    potokUser,
    telegramAuthEnabled,
    traktConnected,
    updateUser,
  } = useAuth();
  const {
    traktProfile,
    deviceCode,
    loadingTrakt,
    startTraktAuth,
    handleTraktLogout,
    setDeviceCode,
    copyToClipboard,
  } = useTraktAuth("trakt");
  const [traktModalOpen, setTraktModalOpen] = useState(false);

  useEffect(() => {
    if (deviceCode) setTraktModalOpen(true);
  }, [deviceCode]);

  useEffect(() => {
    if (traktConnected && traktProfile) setTraktModalOpen(false);
  }, [traktConnected, traktProfile]);

  if (!potokUser) return null;

  const closeTraktModal = () => {
    setDeviceCode(null);
    setTraktModalOpen(false);
  };

  const handleUnlinkTelegram = async () => {
    try {
      const updated = await AuthApiClient.unlinkTelegram();
      updateUser(updated);
      showHUD("info", t("account.telegramUnlinked"));
    } catch (err: unknown) {
      showHUD("error", err instanceof Error ? err.message : t("account.actionFailed"));
    }
  };

  const handleConnectTrakt = () => {
    setTraktModalOpen(true);
    void startTraktAuth();
  };

  const traktStatus = traktConnected
    ? traktProfile?.username
      ? t("account.traktLinkedAs", { username: traktProfile.username })
      : t("account.traktLinked")
    : t("account.traktLinkDesc");

  return (
    <>
      <SettingsCard
        title={t("account.connectedAccountsTitle")}
        icon={<Paperclip size="1.125rem" />}
        className="connected-accounts-card"
        bodyClassName="settings-card__body--flush"
      >
        {telegramAuthEnabled && (
          <div className="connected-account-row">
            <div className="connected-account-row__icon connected-account-row__icon--telegram" aria-hidden>
              <Send size="1.25rem" />
            </div>
            <div className="connected-account-row__copy">
              <h3 className="connected-account-row__title">Telegram</h3>
              <p className="connected-account-row__status">
                {potokUser.telegramLinked
                  ? potokUser.telegramUsername
                    ? t("account.telegramLinkedAs", { username: potokUser.telegramUsername })
                    : t("account.telegramLinked")
                  : t("account.telegramLinkDesc")}
              </p>
            </div>
            <div className="connected-account-row__action">
              {potokUser.telegramLinked ? (
                <Button type="button" variant="ghost" className="btn-gap-s" onClick={handleUnlinkTelegram}>
                  <Link2Off size="1rem" />
                  <span>{t("account.unlink")}</span>
                </Button>
              ) : (
                <TelegramStartAuthButton
                  label={t("account.link")}
                  onComplete={(result) => {
                    updateUser(result.user);
                    showHUD("success", t("account.telegramLinkedSuccess"));
                  }}
                />
              )}
            </div>
          </div>
        )}

        <div className="connected-account-row">
          <div className="connected-account-row__icon connected-account-row__icon--trakt" aria-hidden>
            <Popcorn size="1.25rem" />
          </div>
          <div className="connected-account-row__copy">
            <h3 className="connected-account-row__title">Trakt.tv</h3>
            <p className="connected-account-row__status">{traktStatus}</p>
          </div>
          <div className="connected-account-row__action">
            {traktConnected ? (
              <Button type="button" variant="ghost" onClick={handleTraktLogout}>
                {t("account.unlink")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="btn-gap-s"
                onClick={handleConnectTrakt}
                disabled={loadingTrakt}
              >
                {loadingTrakt ? <Loader2 size="1rem" className="spin" /> : <Paperclip size="1rem" />}
                <span>{loadingTrakt ? t("account.linking") : t("account.link")}</span>
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>

      <Overlay
        open={traktModalOpen}
        onClose={closeTraktModal}
        accessibleModal
        ariaLabel={t("account.traktModalTitle")}
        styled={false}
        backdropClassName="manifest-modal-overlay"
        className="manifest-modal manifest-modal--narrow connected-accounts-modal"
      >
        <div className="manifest-modal-header">
          <div className="connected-accounts-modal__heading">
            <div className="connected-account-row__icon connected-account-row__icon--trakt" aria-hidden>
              <Popcorn size="1.25rem" />
            </div>
            <div>
              <h3 className="manifest-modal-title">{t("account.traktModalTitle")}</h3>
              <span className="manifest-modal-subtitle">Trakt.tv</span>
            </div>
          </div>
          <IconButton
            type="button"
            onClick={closeTraktModal}
            className="manifest-modal-close"
            aria-label={t("account.close")}
            title={t("account.close")}
          >
            <X size="1.25rem" />
          </IconButton>
        </div>

        <div className="manifest-modal-body connected-accounts-modal__body">
          {deviceCode ? (
            <TraktDeviceAuthView
              deviceCode={deviceCode}
              onCancel={closeTraktModal}
              onCopyCode={() => copyToClipboard(deviceCode.user_code)}
              presentation="modal"
            />
          ) : loadingTrakt ? (
            <div className="connected-accounts-modal__loading" role="status">
              <RefreshCw size="1.5rem" className="spin" />
              <span>{t("account.traktPreparing")}</span>
            </div>
          ) : (
            <div className="connected-accounts-modal__loading" role="status">
              <span>{t("account.traktCodeUnavailable")}</span>
              <Button type="button" variant="secondary" onClick={() => void startTraktAuth()}>
                {t("account.retry")}
              </Button>
            </div>
          )}
        </div>
      </Overlay>
    </>
  );
};

export default ConnectedAccountsSettings;

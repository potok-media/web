import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Link2Off,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Popcorn,
  RefreshCw,
  Send,
  Unlink,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AppSettingsContext";
import { useHUD } from "../../context/useHUD";
import { useTraktAuth } from "../../hooks/useTraktAuth";
import { AuthApiClient } from "../../network/AuthApiClient";
import { ApiError } from "../../network/ApiTypes";
import { Overlay } from "../common/Overlay";
import { TelegramStartAuthButton } from "../profile/TelegramStartAuthButton";
import { TraktDeviceAuthView } from "../profile/TraktDeviceAuthView";
import { Button, IconButton, PopoverItem, Switch } from "../ui";
import { SettingsCard } from "./SettingsCard";
import "../../styles/profile.css";

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
  } = useTraktAuth();
  const [traktModalOpen, setTraktModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [traktMenuOpen, setTraktMenuOpen] = useState(false);
  const [traktMenuOpenLeft, setTraktMenuOpenLeft] = useState(false);
  const [wipeBeforeImport, setWipeBeforeImport] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const traktMenuRef = useRef<HTMLDivElement | null>(null);
  const transferPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A transfer outlives the click: poll the job status ~every 3s, up to ~3 minutes.
  useEffect(() => () => {
    if (transferPollRef.current) clearTimeout(transferPollRef.current);
  }, []);

  const toggleTraktMenu = () => {
    setTraktMenuOpen((open) => {
      if (!open && traktMenuRef.current) {
        // Open to the right of the trigger by default; flip left when the popup would
        // overflow the viewport's right edge.
        const rect = traktMenuRef.current.getBoundingClientRect();
        setTraktMenuOpenLeft(rect.right + 200 > window.innerWidth - 8);
      }
      return !open;
    });
  };

  useEffect(() => {
    if (!traktMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (traktMenuRef.current && event.target instanceof Node
        && !traktMenuRef.current.contains(event.target)) {
        setTraktMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTraktMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [traktMenuOpen]);

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

  const showTransferError = (err: unknown) => {
    showHUD(
      "error",
      err instanceof ApiError && err.message === "TRAKT_NOT_CONNECTED"
        ? t("account.traktNotConnected")
        : t("account.traktTransferFailed"),
    );
  };

  const pollTransferStatus = (deadline: number) => {
    transferPollRef.current = setTimeout(() => {
      void (async () => {
        try {
          const status = await AuthApiClient.traktAllTransferStatus();
          if (status.status === "running") {
            if (Date.now() < deadline) {
              pollTransferStatus(deadline);
            } else {
              showHUD("info", t("account.traktTransferTimeout"));
            }
            return;
          }
          if (status.status === "done") {
            const watchlist = status.listsResult?.watchlist;
            const favorites = status.listsResult?.favorites;
            showHUD("success", t("account.traktTransferDone", {
              history: status.importResult?.imported ?? status.exportResult?.exported ?? 0,
              historySkipped: status.importResult?.skipped ?? status.exportResult?.skipped ?? 0,
              historyErrors: status.importResult?.errors ?? status.exportResult?.errors ?? 0,
              watchlistMovies: watchlist?.movies ?? 0,
              watchlistShows: watchlist?.shows ?? 0,
              watchlistSkipped: watchlist?.skipped ?? 0,
              favoritesMovies: favorites?.movies ?? 0,
              favoritesShows: favorites?.shows ?? 0,
            }));
          } else {
            showHUD("error", t("account.traktTransferFailed"));
          }
        } catch {
          if (Date.now() < deadline) {
            pollTransferStatus(deadline);
          } else {
            showHUD("error", t("account.traktTransferFailed"));
          }
        } finally {
          setTransferBusy(false);
        }
      })();
    }, 3000);
  };

  const startTransfer = async (
    start: () => Promise<void>,
    startedKey: string,
  ) => {
    if (transferBusy) return;
    setTransferBusy(true);
    try {
      await start();
      showHUD("info", t(startedKey));
      pollTransferStatus(Date.now() + 3 * 60 * 1000);
      return true;
    } catch (err: unknown) {
      setTransferBusy(false);
      if (err instanceof ApiError && err.message === "TRAKT_TRANSFER_RUNNING") {
        showHUD("info", t("account.traktTransferRunning"));
        pollTransferStatus(Date.now() + 3 * 60 * 1000);
        return true;
      }
      showTransferError(err);
      return false;
    }
  };

  const handleExport = async () => {
    await startTransfer(
      () => AuthApiClient.traktStartAllExport(),
      "account.traktExportStarted",
    );
  };

  const handleImport = async () => {
    const started = await startTransfer(
      () => AuthApiClient.traktStartAllImport(wipeBeforeImport),
      "account.traktImportStarted",
    );
    if (started) {
      setImportModalOpen(false);
      setWipeBeforeImport(false);
    }
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
              <div className="popover-wrapper popover-wrapper-relative connected-accounts-menu" ref={traktMenuRef}>
                <IconButton
                  type="button"
                  className={traktMenuOpen ? "active-accent" : undefined}
                  onClick={toggleTraktMenu}
                  disabled={transferBusy}
                  aria-label={t("account.traktActions")}
                  title={t("account.traktActions")}
                >
                  {transferBusy ? <Loader2 size="1rem" className="spin" /> : <MoreHorizontal size="1.25rem" />}
                </IconButton>
                {traktMenuOpen && (
                  <div
                    className={`popover-dropdown-menu popover-dropdown-menu-positioned connected-accounts-menu__popup ${
                      traktMenuOpenLeft
                        ? "connected-accounts-menu__popup--left"
                        : "connected-accounts-menu__popup--right"
                    }`}
                  >
                    <PopoverItem
                      className="popover-menu-item"
                      onClick={() => {
                        setTraktMenuOpen(false);
                        void handleExport();
                      }}
                    >
                      <Upload size="1rem" className="popover-menu-item-icon-muted" />
                      <span>{t("account.traktExport")}</span>
                    </PopoverItem>
                    <PopoverItem
                      className="popover-menu-item"
                      onClick={() => {
                        setTraktMenuOpen(false);
                        setImportModalOpen(true);
                      }}
                    >
                      <Download size="1rem" className="popover-menu-item-icon-muted" />
                      <span>{t("account.traktImport")}</span>
                    </PopoverItem>
                    <div className="connected-accounts-menu__divider" role="separator" />
                    <PopoverItem
                      className="popover-menu-item connected-accounts-menu__item--danger"
                      onClick={() => {
                        setTraktMenuOpen(false);
                        handleTraktLogout();
                      }}
                    >
                      <Unlink size="1rem" className="popover-menu-item-icon-muted" />
                      <span>{t("account.unlink")}</span>
                    </PopoverItem>
                  </div>
                )}
              </div>
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

      <Overlay
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        accessibleModal
        ariaLabel={t("account.traktImportTitle")}
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
              <h3 className="manifest-modal-title">{t("account.traktImportTitle")}</h3>
              <span className="manifest-modal-subtitle">Trakt.tv</span>
            </div>
          </div>
          <IconButton
            type="button"
            onClick={() => setImportModalOpen(false)}
            className="manifest-modal-close"
            aria-label={t("account.close")}
            title={t("account.close")}
          >
            <X size="1.25rem" />
          </IconButton>
        </div>

        <div className="manifest-modal-body connected-accounts-modal__body">
          <p className="connected-accounts-modal__description">{t("account.traktImportDesc")}</p>
          <label className="skip-fillers-toggle connected-accounts-modal__wipe-toggle">
            <span>{t("account.traktImportWipe")}</span>
            <Switch
              checked={wipeBeforeImport}
              onCheckedChange={setWipeBeforeImport}
              aria-label={t("account.traktImportWipe")}
            />
          </label>
          {wipeBeforeImport && (
            <p className="connected-accounts-modal__warning" role="alert">
              {t("account.traktImportWipeWarning")}
            </p>
          )}
          <div className="connected-accounts-modal__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImportModalOpen(false)}
              disabled={transferBusy}
            >
              {t("account.traktImportCancel")}
            </Button>
            <Button
              type="button"
              variant={wipeBeforeImport ? "danger" : "primary"}
              onClick={() => void handleImport()}
              disabled={transferBusy}
            >
              {transferBusy ? <Loader2 size="1rem" className="spin" /> : <Upload size="1rem" />}
              <span>{t("account.traktImportConfirm")}</span>
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  );
};

export default ConnectedAccountsSettings;

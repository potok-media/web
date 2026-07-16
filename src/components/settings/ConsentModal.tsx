import React from "react";
import { useTranslation } from "react-i18next";
import { X, ShieldAlert, Loader2 } from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";
import { Overlay } from "../common/Overlay";
import { Button, IconButton } from "../ui";

interface Props {
  manifest: ExtensionManifest;
  displayName: string;
  isInstalling?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const PERMISSION_DESCRIPTION_KEYS: Record<string, string> = {
  "storage": "consent.permissionStorage",
  "http-proxy": "consent.permissionHttpProxy",
  "ui-notifications": "consent.permissionUiNotifications",
  "custom-css": "consent.permissionCustomCss"
};

export const ConsentModal: React.FC<Props> = ({
  manifest,
  displayName,
  isInstalling = false,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation("settings");
  const requestedPermissions = manifest.permissions || [];

  return (
    <Overlay
      open
      onClose={isInstalling ? () => {} : onClose}
      closeOnBackdrop={!isInstalling}
      styled={false}
      backdropClassName="manifest-modal-overlay"
      className="manifest-modal manifest-modal--narrow"
    >
      <div className="manifest-modal-header consent-modal-header">
        <div className="potok-hstack consent-modal-title-row">
          <ShieldAlert size="1.5rem" className="consent-modal-icon" />
          <div>
            <h3 className="manifest-modal-title consent-modal-title">
              {t("consent.title")}
            </h3>
            <span className="consent-modal-subtitle">
              {t("consent.installing", { name: displayName })}
            </span>
          </div>
        </div>
        <IconButton
          type="button"
          onClick={onClose}
          disabled={isInstalling}
          className="manifest-modal-close"
          title={t("consent.close")}
          aria-label={t("consent.close")}
        >
          <X size="1.25rem" />
        </IconButton>
      </div>

      <div className="manifest-modal-body consent-modal-body">
        <div>
          <span className="potok-text potok-text-secondary consent-modal-lead">
            {t("consent.requestsAccess")}
          </span>
          <ul className="consent-modal-permissions">
            {requestedPermissions.map((perm) => (
              <li key={perm}>
                <strong>{perm}</strong> — {PERMISSION_DESCRIPTION_KEYS[perm] ? t(PERMISSION_DESCRIPTION_KEYS[perm]) : t("consent.permissionCustom", { permission: perm })}
              </li>
            ))}
          </ul>
        </div>

        <div className="consent-modal-warning">
          <strong className="consent-modal-warning-title">⚠️ {t("consent.securityWarningTitle")}</strong>
          <span className="potok-text consent-modal-warning-body">
            {t("consent.securityWarningBody")}
          </span>
        </div>
      </div>

      <div className="manifest-modal-footer consent-modal-footer">
        <Button
          type="button"
          onClick={onConfirm}
          variant="primary"
          size="sm"
          disabled={isInstalling}
          className="consent-modal-confirm"
        >
          {isInstalling ? (
            <span className="consent-modal-confirm-inner">
              <Loader2 size="1rem" className="consent-modal-spinner" aria-hidden />
              {t("consent.confirming")}
            </span>
          ) : (
            t("consent.confirm")
          )}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="sm"
          disabled={isInstalling}
          className="consent-modal-cancel"
        >
          {t("consent.cancel")}
        </Button>
      </div>
    </Overlay>
  );
};

export default ConsentModal;
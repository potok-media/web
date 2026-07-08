import React from "react";
import { useTranslation } from "react-i18next";
import { X, ShieldAlert } from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";
import { Overlay } from "../common/Overlay";

interface Props {
  manifest: ExtensionManifest;
  onConfirm: () => void;
  onClose: () => void;
}

const PERMISSION_DESCRIPTION_KEYS: Record<string, string> = {
  "storage": "consent.permissionStorage",
  "http-proxy": "consent.permissionHttpProxy",
  "ui-notifications": "consent.permissionUiNotifications"
};

export const ConsentModal: React.FC<Props> = ({ manifest, onConfirm, onClose }) => {
  const { t } = useTranslation("settings");
  const requestedPermissions = manifest.permissions || [];

  return (
    <Overlay
      open
      onClose={onClose}
      styled={false}
      backdropClassName="manifest-modal-overlay"
      className="manifest-modal"
      style={{ maxWidth: "34rem" }}
    >
      <div className="manifest-modal-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
        <div className="potok-hstack" style={{ alignItems: "center", gap: "0.625rem" }}>
          <ShieldAlert size="1.5rem" style={{ color: "#ff9f1a" }} />
          <div>
            <h3 className="manifest-modal-title" style={{ color: "#ff9f1a", fontWeight: 700 }}>
              {t("consent.title")}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.7 }}>
              {t("consent.installing", { name: manifest.name })}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="manifest-modal-close" title={t("consent.close")}>
          <X size="1.25rem" />
        </button>
      </div>

      <div className="manifest-modal-body" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <span className="potok-text potok-text-secondary" style={{ fontSize: "0.9rem", display: "block", marginBottom: "0.5rem" }}>
            {t("consent.requestsAccess")}
          </span>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--text-primary)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {requestedPermissions.map((perm) => (
              <li key={perm}>
                <strong style={{ color: "#fff" }}>{perm}</strong> — {PERMISSION_DESCRIPTION_KEYS[perm] ? t(PERMISSION_DESCRIPTION_KEYS[perm]) : t("consent.permissionCustom", { permission: perm })}
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          background: "rgba(255, 159, 26, 0.06)",
          border: "1px solid rgba(255, 159, 26, 0.2)",
          borderRadius: "0.5rem",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <strong style={{ color: "#ff9f1a", fontSize: "0.85rem" }}>⚠️ {t("consent.securityWarningTitle")}</strong>
          <span className="potok-text" style={{ fontSize: "0.82rem", lineHeight: "1.4", color: "rgba(255,255,255,0.85)" }}>
            {t("consent.securityWarningBody")}
          </span>
        </div>
      </div>

      <div className="manifest-modal-footer" style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onConfirm}
          className="potok-btn potok-btn-primary"
          style={{ fontSize: "0.85rem", padding: "0.6rem 1.2rem", background: "#ff9f1a", borderColor: "#ff9f1a", color: "#000", fontWeight: "bold" }}
        >
          {t("consent.confirm")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="potok-btn potok-btn-ghost"
          style={{ fontSize: "0.85rem", padding: "0.6rem 1.2rem", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "0.375rem", color: "var(--text-primary)" }}
        >
          {t("consent.cancel")}
        </button>
      </div>
    </Overlay>
  );
};

export default ConsentModal;

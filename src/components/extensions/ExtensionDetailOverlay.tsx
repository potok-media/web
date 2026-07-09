import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy, Trash2, Power, ChevronDown } from "lucide-react";
import type { RegisteredExtension } from "@potok/sdk-types";
import { Overlay } from "../common/Overlay";
import { Button, IconButton } from "../ui";
import { getExtensionIcon, getSourceLabel, PERMISSION_KEYS } from "./extensionUiHelpers";

interface ExtensionDetailOverlayProps {
  extension: RegisteredExtension;
  onClose: () => void;
  onToggle: (id: string) => void;
  onCopyLink: (url: string) => void;
  onDelete: (id: string) => void;
}

export const ExtensionDetailOverlay: React.FC<ExtensionDetailOverlayProps> = ({
  extension,
  onClose,
  onToggle,
  onCopyLink,
  onDelete,
}) => {
  const { t } = useTranslation("extensions");
  const [showManifest, setShowManifest] = useState(false);

  return (
    <Overlay
      open
      onClose={onClose}
      styled={false}
      backdropClassName="manifest-modal-overlay"
      className="manifest-modal manifest-modal--detail"
    >
      <div className="manifest-modal-header">
        <div className="ext-action-head">
          <div className="ext-row-icon">{getExtensionIcon(extension.manifest)}</div>
          <div>
            <h3 className="manifest-modal-title">{extension.manifest.name ? t(extension.manifest.name) : ""}</h3>
            <span className="ext-action-sub">{getSourceLabel(extension.url)} · {extension.id}</span>
          </div>
        </div>
        <IconButton onClick={onClose} className="manifest-modal-close" title={t("close")} aria-label={t("close")}>
          <X size="1.25rem" />
        </IconButton>
      </div>

      <div className="manifest-modal-body ext-action-body">
        <div className="ext-action-buttons">
          <Button
            variant={extension.enabled ? "secondary" : "primary"}
            className="ext-action-btn"
            onClick={() => onToggle(extension.id)}
          >
            <Power size="1rem" />
            <span>{extension.enabled ? t("action.disable") : t("action.enable")}</span>
          </Button>
          <Button variant="secondary" className="ext-action-btn" onClick={() => onCopyLink(extension.url)}>
            <Copy size="1rem" />
            <span>{t("action.copyLink")}</span>
          </Button>
          <Button
            variant="danger"
            className="ext-action-btn ext-action-danger"
            onClick={() => { onDelete(extension.id); onClose(); }}
          >
            <Trash2 size="1rem" />
            <span>{t("action.delete")}</span>
          </Button>
        </div>

        {extension.manifest.description && (
          <div className="ext-action-section">
            <span className="ext-action-label">{t("section.description")}</span>
            <p className="ext-action-text">{t(extension.manifest.description)}</p>
          </div>
        )}

        {extension.manifest.permissions && extension.manifest.permissions.length > 0 && (
          <div className="ext-action-section">
            <span className="ext-action-label">{t("section.permissions")}</span>
            <div className="ext-perm-list">
              {extension.manifest.permissions.map((p) => (
                <div key={p} className="ext-perm">
                  <span className="ext-perm-name">{p}</span>
                  <span className="ext-perm-desc">
                    {PERMISSION_KEYS[p] ? t(PERMISSION_KEYS[p]) : t("permissionDescriptions.fallback", { permission: p })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="secondary" className="ext-action-btn" onClick={() => setShowManifest((v) => !v)}>
          <ChevronDown size="0.875rem" className={`chevron-toggle-icon${showManifest ? " is-open" : ""}`} />
          <span>{showManifest ? t("manifest.hide") : t("manifest.show")}</span>
        </Button>
        {showManifest && (
          <pre className="manifest-json-pre manifest-json-pre--scroll">
            {JSON.stringify(extension.manifest, null, 2)}
          </pre>
        )}
      </div>
    </Overlay>
  );
};
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy, Check } from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";
import { useHUD } from "../../context/useHUD";
import { Overlay } from "../common/Overlay";
import { Button, IconButton } from "../ui";

interface Props {
  manifest: ExtensionManifest;
  onClose: () => void;
}

export const ManifestViewerModal: React.FC<Props> = ({ manifest, onClose }) => {
  const { show: showHUD } = useHUD();
  const { t } = useTranslation("settings");
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(manifest, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      showHUD("success", t("manifest.copySuccess"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showHUD("error", t("manifest.copyError"));
    }
  };

  return (
    <Overlay
      open
      onClose={onClose}
      styled={false}
      backdropClassName="manifest-modal-overlay"
      className="manifest-modal"
    >
      <div className="manifest-modal-header">
        <div>
          <h3 className="manifest-modal-title">{t("manifest.title")}</h3>
          <span className="manifest-modal-subtitle">
            {t("manifest.nameWithId", { name: manifest.name, id: manifest.id })}
          </span>
        </div>
        <IconButton onClick={onClose} className="manifest-modal-close" title={t("manifest.close")} aria-label={t("manifest.close")}>
          <X size="1.25rem" />
        </IconButton>
      </div>

      <div className="manifest-modal-body">
        <pre className="manifest-json-pre">
          {jsonString}
        </pre>
      </div>

      <div className="manifest-modal-footer">
        <Button variant="primary" size="sm" onClick={handleCopy}>
          {copied ? <Check size="1rem" className="manifest-copy-icon--success" /> : <Copy size="1rem" />}
          <span>{copied ? t("manifest.copied") : t("manifest.copy")}</span>
        </Button>
        <Button variant="secondary" size="sm" className="settings-form-btn-cancel" onClick={onClose}>
          {t("manifest.close")}
        </Button>
      </div>
    </Overlay>
  );
};

export default ManifestViewerModal;

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Copy, Check } from "lucide-react";
import type { ExtensionManifest } from "@potok/sdk-types";
import { useHUD } from "../../context/HUDContext";
import { FocusableButton } from "../common/TVNavigation";
import { Overlay } from "../common/Overlay";

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
      focusKey="MANIFEST_MODAL"
      initialFocusKey="MANIFEST_MODAL_CLOSE"
      styled={false}
      backdropClassName="manifest-modal-overlay"
      className="manifest-modal"
    >
      <div className="manifest-modal-header">
        <div>
          <h3 className="manifest-modal-title">{t("manifest.title")}</h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.7 }}>
            {t("manifest.nameWithId", { name: manifest.name, id: manifest.id })}
          </span>
        </div>
        <FocusableButton onClick={onClose} className="manifest-modal-close" title={t("manifest.close")}>
          <X size="1.25rem" />
        </FocusableButton>
      </div>

      <div className="manifest-modal-body">
        <pre className="manifest-json-pre">
          {jsonString}
        </pre>
      </div>

      <div className="manifest-modal-footer">
        <FocusableButton onClick={handleCopy} className="settings-btn-primary" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
          {copied ? <Check size="1rem" style={{ color: "#4f9e71" }} /> : <Copy size="1rem" />}
          <span>{copied ? t("manifest.copied") : t("manifest.copy")}</span>
        </FocusableButton>
        <FocusableButton focusKey="MANIFEST_MODAL_CLOSE" onClick={onClose} className="settings-btn-primary settings-form-btn-cancel" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
          {t("manifest.close")}
        </FocusableButton>
      </div>
    </Overlay>
  );
};

export default ManifestViewerModal;

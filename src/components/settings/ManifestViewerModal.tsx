import React, { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(manifest, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      showHUD("success", "Манифест успешно скопирован в буфер обмена");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showHUD("error", "Не удалось скопировать манифест");
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
          <h3 className="manifest-modal-title">Манифест расширения</h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.7 }}>
            {manifest.name} (ID: {manifest.id})
          </span>
        </div>
        <FocusableButton onClick={onClose} className="manifest-modal-close" title="Закрыть">
          <X size={20} />
        </FocusableButton>
      </div>

      <div className="manifest-modal-body">
        <pre className="manifest-json-pre">
          {jsonString}
        </pre>
      </div>

      <div className="manifest-modal-footer">
        <FocusableButton onClick={handleCopy} className="settings-btn-primary" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
          {copied ? <Check size={16} style={{ color: "#4f9e71" }} /> : <Copy size={16} />}
          <span>{copied ? "Скопировано!" : "Копировать"}</span>
        </FocusableButton>
        <FocusableButton focusKey="MANIFEST_MODAL_CLOSE" onClick={onClose} className="settings-btn-primary settings-form-btn-cancel" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
          Закрыть
        </FocusableButton>
      </div>
    </Overlay>
  );
};

export default ManifestViewerModal;

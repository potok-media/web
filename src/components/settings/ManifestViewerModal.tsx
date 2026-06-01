import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { X, Copy, Check } from "lucide-react";
import type { ExtensionManifest } from "../../network/SDKTypes";
import { useHUD } from "../../context/HUDContext";

interface Props {
  manifest: ExtensionManifest;
  onClose: () => void;
}

export const ManifestViewerModal: React.FC<Props> = ({ manifest, onClose }) => {
  const { show: showHUD } = useHUD();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  const modalHtml = (
    <div className="manifest-modal-overlay" onClick={onClose}>
      <div className="manifest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="manifest-modal-header">
          <div>
            <h3 className="manifest-modal-title">Манифест расширения</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.7 }}>
              {manifest.name} (ID: {manifest.id})
            </span>
          </div>
          <button onClick={onClose} className="manifest-modal-close" title="Закрыть">
            <X size={20} />
          </button>
        </div>

        <div className="manifest-modal-body">
          <pre className="manifest-json-pre">
            {jsonString}
          </pre>
        </div>

        <div className="manifest-modal-footer">
          <button onClick={handleCopy} className="settings-btn-primary" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
            {copied ? <Check size={16} style={{ color: "#4f9e71" }} /> : <Copy size={16} />}
            <span>{copied ? "Скопировано!" : "Копировать"}</span>
          </button>
          <button onClick={onClose} className="settings-btn-primary settings-form-btn-cancel" style={{ fontSize: "0.9rem", padding: "0.5rem 1rem" }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalHtml, document.body);
};

export default ManifestViewerModal;

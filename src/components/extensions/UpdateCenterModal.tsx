import React from "react";
import { RotateCw, X } from "lucide-react";
import type { UpdateItem } from "../../hooks/useExtensionUpdates";
import type { ExtensionManifest } from "../../network/SDKTypes";

interface UpdateCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUpdates: UpdateItem[];
  updatingIds: Set<string>;
  onUpdateSingle: (id: string, remoteManifest: ExtensionManifest) => Promise<void>;
  onUpdateAll: () => Promise<void>;
}

export const UpdateCenterModal: React.FC<UpdateCenterModalProps> = ({
  isOpen,
  onClose,
  availableUpdates,
  updatingIds,
  onUpdateSingle,
  onUpdateAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="potok-update-modal-overlay">
      <div className="potok-update-modal-dialog">
        <div className="potok-update-modal-header">
          <div className="potok-update-modal-title-sec">
            <RotateCw size={16} style={{ color: "#38bdf8" }} />
            <span className="potok-update-modal-title">
              Центр обновлений Potok
            </span>
          </div>
          <button 
            type="button"
            className="potok-update-modal-close-btn"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="potok-update-modal-body">
          {availableUpdates.map((update) => {
            const isUpdating = updatingIds.has(update.id);
            return (
              <div key={update.id} className="potok-update-modal-item">
                <div className="potok-update-modal-item-details">
                  <span className="potok-update-modal-item-name">
                    {update.name}
                  </span>
                  <div className="potok-update-modal-item-versions">
                    <span className="potok-badge potok-badge-secondary" style={{ fontSize: "0.75rem", padding: "2px 6px" }}>
                      v{update.currentVersion}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>→</span>
                    <span className="potok-badge potok-update-modal-badge-new">
                      v{update.newVersion}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="potok-update-modal-btn-update"
                  disabled={isUpdating}
                  onClick={() => onUpdateSingle(update.id, update.manifest)}
                >
                  {isUpdating ? (
                    <>
                      <RotateCw size={10} className="animate-spin" />
                      <span>Обновление...</span>
                    </>
                  ) : (
                    <span>Обновить</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="potok-update-modal-footer">
          <button 
            type="button"
            className="potok-btn potok-btn-secondary" 
            style={{ fontSize: "0.8rem", padding: "8px 14px", borderRadius: "8px" }}
            onClick={onClose}
          >
            Закрыть
          </button>
          <button 
            type="button"
            className="potok-update-modal-btn-all"
            disabled={updatingIds.size > 0}
            onClick={onUpdateAll}
          >
            Обновить всё
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateCenterModal;

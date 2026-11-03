import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Folder, Pencil, Trash2, X } from "lucide-react";
import { Overlay } from "../common/Overlay";
import { Button, IconButton, Input } from "../ui";
import { getUserData } from "../../utils/userData";
import type { UserFolder } from "../../utils/userData";

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fires after any mutation so openers (folder pages) can refresh their data. */
  onChanged?: () => void;
}

/**
 * Collection ("подборки") management: create, inline rename, two-phase delete. Opened from the
 * library header; folder contents live on the /library/folder/:folderId route.
 */
export const FolderManagerModal: React.FC<FolderManagerModalProps> = ({
  isOpen,
  onClose,
  onChanged,
}) => {
  const { t } = useTranslation("media");
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFolders(await getUserData().listFolders());
    } catch {
      /* keep the previous list on a transient failure */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setEditingId(null);
    setConfirmingId(null);
    void refresh();
  }, [isOpen, refresh]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await getUserData().createFolder(name);
      setNewName("");
      onChanged?.();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (folderId: string) => {
    const name = editName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await getUserData().renameFolder(folderId, name);
      setEditingId(null);
      onChanged?.();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await getUserData().deleteFolder(folderId);
      setConfirmingId(null);
      onChanged?.();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      styled={false}
      backdropClassName="modal-overlay"
      className="modal-container modal-container-files"
    >
      <div className="modal-header">
        <div className="modal-title-row">
          <IconButton className="modal-close-btn" onClick={onClose} aria-label={t("folders.close")}>
            <X size="1.25rem" />
          </IconButton>
          <div className="modal-title-text-group">
            <h3 className="modal-title modal-title-custom-size">{t("folders.title")}</h3>
          </div>
        </div>
      </div>

      <div className="folder-manager-body">
        {loading && folders.length === 0 ? null : (
          <div className="folder-manager-list">
            {folders.length === 0 && <div className="details-picker-empty">{t("folders.empty")}</div>}
            {folders.map((folder) => (
              <div key={folder.id} className="folder-manager-row">
                {confirmingId === folder.id ? (
                  <>
                    <span className="folder-manager-confirm-text">
                      {t("folders.deleteConfirm", { name: folder.name })}
                    </span>
                    <div className="folder-manager-row-actions">
                      <Button
                        variant="danger"
                        className="folder-manager-action-btn"
                        onClick={() => void handleDelete(folder.id)}
                        disabled={busy}
                      >
                        {t("folders.delete")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="folder-manager-action-btn"
                        onClick={() => setConfirmingId(null)}
                        disabled={busy}
                      >
                        {t("folders.cancel")}
                      </Button>
                    </div>
                  </>
                ) : editingId === folder.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleRename(folder.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <div className="folder-manager-row-actions">
                      <IconButton
                        className="folder-manager-icon-btn"
                        onClick={() => void handleRename(folder.id)}
                        disabled={busy || !editName.trim()}
                        aria-label={t("folders.rename")}
                      >
                        <Check size="1rem" />
                      </IconButton>
                      <IconButton
                        className="folder-manager-icon-btn"
                        onClick={() => setEditingId(null)}
                        aria-label={t("folders.cancel")}
                      >
                        <X size="1rem" />
                      </IconButton>
                    </div>
                  </>
                ) : (
                  <div className="folder-manager-row-main">
                    <Folder size="1rem" className="details-picker-item-icon" />
                    <span className="folder-manager-name">{folder.name}</span>
                    <span className="details-picker-count">
                      {t("folders.itemCount", { count: folder.itemCount })}
                    </span>
                    <div className="folder-manager-row-actions">
                      <IconButton
                        className="folder-manager-icon-btn"
                        onClick={() => {
                          setEditingId(folder.id);
                          setEditName(folder.name);
                        }}
                        aria-label={t("folders.rename")}
                      >
                        <Pencil size="1rem" />
                      </IconButton>
                      <IconButton
                        className="folder-manager-icon-btn"
                        onClick={() => setConfirmingId(folder.id)}
                        aria-label={t("folders.delete")}
                      >
                        <Trash2 size="1rem" />
                      </IconButton>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="details-picker-new">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t("folders.newPlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
          />
          <Button
            variant="accent"
            className="details-picker-create-btn"
            onClick={() => void handleCreate()}
            disabled={busy || !newName.trim()}
          >
            {t("folders.create")}
          </Button>
        </div>
      </div>
    </Overlay>
  );
};

export default FolderManagerModal;

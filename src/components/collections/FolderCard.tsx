import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, IconButton, Input } from "../ui";
import type { UserFolder } from "../../utils/userData";
import { FolderCover } from "./FolderCover";
import type { FolderCoverCell } from "./mosaicModel";

interface FolderCardProps {
  folder: UserFolder;
  coverCells: FolderCoverCell[];
  busy: boolean;
  onOpen: (folderId: string) => void;
  onRename: (folderId: string, name: string) => Promise<void>;
  onDelete: (folderId: string) => Promise<void>;
}

type CardMode = "view" | "rename" | "confirm";

/**
 * Collection tile on the /collections grid: 2×2 poster mosaic, name and item count, with a
 * hover-revealed menu (rename / delete). Rename swaps the name for an inline input; delete is
 * two-phase — the first click asks for confirmation on the card itself.
 */
export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  coverCells,
  busy,
  onOpen,
  onRename,
  onDelete,
}) => {
  const { t } = useTranslation("media");
  const [mode, setMode] = useState<CardMode>("view");
  const [editName, setEditName] = useState(folder.name);

  const openFolder = () => {
    if (mode === "view") onOpen(folder.id);
  };

  const submitRename = async () => {
    const name = editName.trim();
    if (!name || busy) return;
    await onRename(folder.id, name);
    setMode("view");
  };

  return (
    <div className="collections-card" data-folder-id={folder.id}>
      <div className="collections-card-cover">
        <Button
          variant="ghost"
          className="collections-card-open"
          onClick={openFolder}
          aria-label={t("collections.open", { name: folder.name })}
          tabIndex={mode === "view" ? 0 : -1}
        >
          <FolderCover cells={coverCells} />
        </Button>
        {mode === "view" && (
          <div className="collections-card-menu">
            <IconButton
              className="collections-card-menu-btn"
              onClick={() => {
                setEditName(folder.name);
                setMode("rename");
              }}
              disabled={busy}
              aria-label={t("collections.rename")}
            >
              <Pencil size="1rem" />
            </IconButton>
            <IconButton
              className="collections-card-menu-btn"
              onClick={() => setMode("confirm")}
              disabled={busy}
              aria-label={t("collections.delete")}
            >
              <Trash2 size="1rem" />
            </IconButton>
          </div>
        )}
      </div>

      <div className="collections-card-footer">
        {mode === "rename" ? (
          <div className="collections-card-rename">
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitRename();
                if (event.key === "Escape") setMode("view");
              }}
              autoFocus
              aria-label={t("collections.rename")}
            />
            <IconButton
              className="collections-card-menu-btn"
              onClick={() => void submitRename()}
              disabled={busy || !editName.trim()}
              aria-label={t("collections.rename")}
            >
              <Check size="1rem" />
            </IconButton>
            <IconButton
              className="collections-card-menu-btn"
              onClick={() => setMode("view")}
              aria-label={t("collections.cancel")}
            >
              <X size="1rem" />
            </IconButton>
          </div>
        ) : mode === "confirm" ? (
          <div className="collections-card-confirm">
            <span className="collections-card-confirm-text">{t("collections.confirmDelete")}</span>
            <IconButton
              className="collections-card-menu-btn is-danger"
              onClick={() => void onDelete(folder.id).then(() => setMode("view"))}
              disabled={busy}
              aria-label={t("collections.delete")}
            >
              <Check size="1rem" />
            </IconButton>
            <IconButton
              className="collections-card-menu-btn"
              onClick={() => setMode("view")}
              aria-label={t("collections.cancel")}
            >
              <X size="1rem" />
            </IconButton>
          </div>
        ) : (
          <>
            <Button variant="ghost" className="collections-card-name" onClick={openFolder}>
              <span className="collections-card-name-text">{folder.name}</span>
            </Button>
            <span className="collections-card-count">{t("collections.itemCount", { count: folder.itemCount })}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default FolderCard;

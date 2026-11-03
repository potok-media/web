import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Folder, FolderPlus } from "lucide-react";
import { Button, IconButton, Input, PopoverItem } from "../ui";
import type { UserFolder } from "../../utils/userData";

interface FolderPickerMenuProps {
  folders: UserFolder[];
  membership: Record<string, boolean>;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => Promise<unknown>;
}

export const FolderPickerMenu: React.FC<FolderPickerMenuProps> = ({
  folders,
  membership,
  onToggleFolder,
  onCreateFolder,
}) => {
  const { t } = useTranslation("media");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const inAnyFolder = folders.some((folder) => membership[folder.id]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await onCreateFolder(name);
      setNewName("");
    } catch {
      /* the caller already surfaces the failure */
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="details-picker-wrapper">
      <IconButton
        className={`action-btn-circle details-picker-trigger ${inAnyFolder ? "active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title={t("folders.title")}
        aria-label={t("folders.title")}
      >
        <FolderPlus size="1.125rem" />
        <ChevronDown size="0.75rem" />
      </IconButton>

      {open && (
        <>
          <div className="popover-overlay" onClick={() => setOpen(false)} />
          <div className="details-picker-menu">
            <div className="popover-header">{t("folders.title")}</div>
            {folders.length === 0 && (
              <div className="details-picker-empty">{t("folders.empty")}</div>
            )}
            {folders.map((folder) => {
              const checked = !!membership[folder.id];
              return (
                <PopoverItem
                  key={folder.id}
                  className="details-picker-item"
                  onClick={() => onToggleFolder(folder.id)}
                >
                  <span className={`details-picker-checkbox ${checked ? "checked" : ""}`}>
                    {checked && <Check size="0.75rem" strokeWidth={3.5} />}
                  </span>
                  <Folder size="1rem" className="details-picker-item-icon" />
                  <span>{folder.name}</span>
                  <span className="details-picker-count">
                    {t("folders.itemCount", { count: folder.itemCount })}
                  </span>
                </PopoverItem>
              );
            })}
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
                variant="glass"
                className="details-picker-create-btn"
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
              >
                {t("folders.create")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FolderPickerMenu;

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { Button, IconButton, Input } from "../ui";

interface NewFolderTileProps {
  busy: boolean;
  onCreate: (name: string) => Promise<void>;
}

/**
 * Trailing "Новая подборка" tile on the collections grid. Clicking turns it into an inline
 * name input + confirm, so creation happens on the spot without a modal.
 */
export const NewFolderTile: React.FC<NewFolderTileProps> = ({ busy, onCreate }) => {
  const { t } = useTranslation("media");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    await onCreate(trimmed);
    setName("");
    setEditing(false);
  };

  if (!editing) {
    return (
      <Button
        variant="ghost"
        className="collections-card collections-new-tile"
        onClick={() => setEditing(true)}
      >
        <Plus size="2rem" className="collections-new-tile-icon" />
        <span className="collections-new-tile-label">{t("collections.newFolder")}</span>
      </Button>
    );
  }

  return (
    <div className="collections-card collections-new-tile is-editing">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("collections.newPlaceholder")}
        onKeyDown={(event) => {
          if (event.key === "Enter") void submit();
          if (event.key === "Escape") {
            setName("");
            setEditing(false);
          }
        }}
        autoFocus
        aria-label={t("collections.newPlaceholder")}
      />
      <div className="collections-new-tile-actions">
        <Button
          variant="accent"
          size="sm"
          onClick={() => void submit()}
          disabled={busy || !name.trim()}
          className="collections-new-tile-create"
        >
          {t("collections.create")}
        </Button>
        <IconButton
          className="collections-card-menu-btn"
          onClick={() => {
            setName("");
            setEditing(false);
          }}
          aria-label={t("collections.cancel")}
        >
          <X size="1rem" />
        </IconButton>
      </div>
    </div>
  );
};

export default NewFolderTile;

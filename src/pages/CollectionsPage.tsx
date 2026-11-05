import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { getUserData, type UserFolder } from "../utils/userData";
import { useFolderCovers } from "../hooks/useFolderCovers";
import { FolderCard } from "../components/collections/FolderCard";
import { NewFolderTile } from "../components/collections/NewFolderTile";
import { Button } from "../components/ui";
import "../styles/collections.css";

/**
 * «Подборки» — a grid of collection tiles: the system «Избранное» card first, then one card per
 * user folder (2×2 poster mosaic, hover menu with rename/delete) and a trailing creation tile.
 * All mutations go through the getUserData() layer, same as FolderManagerModal.
 */
export const CollectionsPage: React.FC = () => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();
  const [folders, setFolders] = useState<UserFolder[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const covers = useFolderCovers(folders ?? []);

  const refresh = useCallback(async () => {
    try {
      setFolders(await getUserData().listFolders());
    } catch {
      setFolders((prev) => prev ?? []);
      setError(t("folders.error"));
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (name: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await getUserData().createFolder(name);
      await refresh();
    } catch {
      setError(t("folders.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (folderId: string, name: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await getUserData().renameFolder(folderId, name);
      await refresh();
    } catch {
      setError(t("folders.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await getUserData().deleteFolder(folderId);
      await refresh();
    } catch {
      setError(t("folders.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="collections-page">
      <h1 className="collections-title">{t("collections.title")}</h1>
      {error && <p className="collections-error">{error}</p>}
      {folders !== null && folders.length === 0 && !error && (
        <p className="collections-empty">{t("collections.empty")}</p>
      )}

      <div className="collections-grid">
        <Button
          variant="ghost"
          className="collections-card collections-favorites-card"
          onClick={() => navigate("/library/favorites")}
        >
          <span className="collections-favorites-cover">
            <Heart size="2.5rem" className="collections-favorites-icon" fill="currentColor" />
          </span>
          <span className="collections-card-footer">
            <span className="collections-card-name-text">{t("collections.favorites")}</span>
          </span>
        </Button>

        {(folders ?? []).map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            coverCells={covers[folder.id] ?? []}
            busy={busy}
            onOpen={(folderId) => navigate(`/library/folder/${folderId}`)}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}

        <NewFolderTile busy={busy} onCreate={handleCreate} />
      </div>
    </div>
  );
};

export default CollectionsPage;

import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { useUserDataCollection } from "../hooks/useUserDataCollection";
import { UserDataGrid } from "../components/library/UserDataGrid";
import { Button } from "../components/ui";

/** Single collection ("подборка") view: the library grid fed by getFolderItems. */
export const LibraryFolderPage: React.FC = () => {
  const { folderId } = useParams<{ folderId: string }>();
  const { t } = useTranslation("media");
  const navigate = useNavigate();
  const { items, total, folderName, loading } = useUserDataCollection("folder", folderId ?? "");

  return (
    <div className="library-page-container library-page-container--collection">
      <header className="library-header">
        <Button variant="ghost" className="folder-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size="1rem" />
          <span>{t("folders.back")}</span>
        </Button>
        <h1 className="library-large-title">{folderName ?? t("folders.title")}</h1>
        {!loading && <p className="library-metadata-count">{t("library.totalCount", { count: total })}</p>}
      </header>
      <main className="library-content-area">
        <UserDataGrid
          items={items}
          loading={loading}
          emptyIcon={FolderOpen}
          emptyTitle={t("folders.emptyItems")}
        />
      </main>
    </div>
  );
};

export default LibraryFolderPage;

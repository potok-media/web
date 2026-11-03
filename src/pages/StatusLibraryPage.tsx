import React from "react";
import { useTranslation } from "react-i18next";
import { Bookmark } from "lucide-react";
import { useUserDataCollection } from "../hooks/useUserDataCollection";
import { UserDataGrid } from "../components/library/UserDataGrid";
import type { TitleStatus } from "../utils/userData";

interface StatusLibraryPageProps {
  status: TitleStatus;
  titleKey: string;
}

/**
 * Library tab backed by the unified user-data layer (planned today; other statuses live on the
 * profile page). Renders inside the standard library page shell so it visually matches the
 * ApiClient-backed categories.
 */
export const StatusLibraryPage: React.FC<StatusLibraryPageProps> = ({ status, titleKey }) => {
  const { t } = useTranslation("media");
  const { items, total, loading } = useUserDataCollection("status", status);

  return (
    <div className="library-page-container library-page-container--collection">
      <header className="library-header">
        <h1 className="library-large-title">{t(titleKey)}</h1>
        {!loading && <p className="library-metadata-count">{t("library.totalCount", { count: total })}</p>}
      </header>
      <main className="library-content-area">
        <UserDataGrid
          items={items}
          loading={loading}
          emptyIcon={Bookmark}
          emptyTitle={t("categories.watchlist.empty")}
          emptySub={t("categories.watchlist.emptySub")}
        />
      </main>
    </div>
  );
};

export default StatusLibraryPage;

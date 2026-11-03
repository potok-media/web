import React from "react";
import { useTranslation } from "react-i18next";
import { Film, type LucideIcon } from "lucide-react";
import type { MediaCard } from "../../network/ApiTypes";
import { MediaCardComponent } from "../MediaCardComponent";
import { LoadingSpinner } from "../LoadingSpinner";
import { Grid } from "../common/Grid";

interface UserDataGridProps {
  items: MediaCard[];
  loading: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle: string;
  emptySub?: string;
}

/**
 * Shared grid + empty state for user-data-backed lists (profile status sections, the planned
 * library tab, folder pages). Extracted from LibraryPage's collection markup so the surfaces
 * stay consistent without duplicating it.
 */
export const UserDataGrid: React.FC<UserDataGridProps> = ({
  items,
  loading,
  emptyIcon: EmptyIcon = Film,
  emptyTitle,
  emptySub,
}) => {
  const { t } = useTranslation("media");

  if (loading && items.length === 0) {
    return <LoadingSpinner height="50vh" message={t("library.loadingCollection")} />;
  }

  if (items.length === 0) {
    return (
      <div className="library-empty-view collection-mode">
        <EmptyIcon size="3rem" className="library-empty-icon muted" />
        <h2 className="library-empty-title">{emptyTitle}</h2>
        {emptySub && <p className="library-empty-subtitle">{emptySub}</p>}
      </div>
    );
  }

  return (
    <Grid className="library-grid">
      {items.map((item) => (
        <MediaCardComponent key={`${item.mediaType}:${item.id}`} item={item} />
      ))}
    </Grid>
  );
};

export default UserDataGrid;

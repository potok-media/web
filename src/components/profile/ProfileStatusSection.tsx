import React from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Check, Pause, Play, X, type LucideIcon } from "lucide-react";
import { useUserDataCollection } from "../../hooks/useUserDataCollection";
import { UserDataGrid } from "../library/UserDataGrid";
import type { TitleStatus } from "../../utils/userData";

const STATUS_ICONS: Record<TitleStatus, LucideIcon> = {
  watching: Play,
  planned: Bookmark,
  completed: Check,
  on_hold: Pause,
  dropped: X,
};

interface ProfileStatusSectionProps {
  status: TitleStatus;
}

/** One of the five watch-status profile tabs — a MediaCard grid fed by listByStatus. */
export const ProfileStatusSection: React.FC<ProfileStatusSectionProps> = ({ status }) => {
  const { t } = useTranslation("profile");
  const { items, loading } = useUserDataCollection("status", status);

  return (
    <UserDataGrid
      items={items}
      loading={loading}
      emptyIcon={STATUS_ICONS[status]}
      emptyTitle={t(`page.sections.${status}.empty`)}
      emptySub={t(`page.sections.${status}.emptySub`)}
    />
  );
};

export default ProfileStatusSection;

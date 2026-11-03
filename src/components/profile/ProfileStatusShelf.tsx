import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import MediaRow from "../MediaRow";
import { useUserDataCollection } from "../../hooks/useUserDataCollection";
import { mediaCardLink } from "../../utils/mediaLink";
import type { MediaCard } from "../../network/ApiTypes";
import type { TitleStatus } from "../../utils/userData";

interface ProfileStatusShelfProps {
  status: TitleStatus;
}

/**
 * One status shelf on the profile page ("Смотрю · 3", "В планах", "Просмотрено"): a capped
 * MediaRow fed by the unified user-data layer — the server list for authenticated users, the
 * guest localStorage store otherwise. Renders nothing while empty.
 */
export const ProfileStatusShelf: React.FC<ProfileStatusShelfProps> = ({ status }) => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();
  const { items, total, loading } = useUserDataCollection("status", status);

  const handleCardClick = useCallback(
    (item: MediaCard) => navigate(mediaCardLink(item)),
    [navigate],
  );
  const handleSeeAllClick = useCallback(
    (id: string) => navigate(`/library/${id}`),
    [navigate],
  );

  if (loading || items.length === 0) return null;

  return (
    <MediaRow
      id={status}
      title={`${t(`status.${status}`)} · ${total}`}
      items={items}
      onCardClick={handleCardClick}
      onSeeAllClick={handleSeeAllClick}
    />
  );
};

export default ProfileStatusShelf;

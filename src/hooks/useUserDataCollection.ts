import { useCallback, useEffect, useState } from "react";
import type { MediaCard } from "../network/ApiTypes";
import { getUserData } from "../utils/userData";
import {
  userFolderItemToMediaCard,
  userStatusRecordToMediaCard,
} from "../utils/userData/mediaItemAdapters";

export type UserDataCollectionKind = "status" | "folder";

/**
 * Feeds a MediaCard grid from the unified user-data layer: kind "status" lists titles by
 * watch status (key = TitleStatus), kind "folder" lists a collection's items (key = folder id).
 */
export function useUserDataCollection(kind: UserDataCollectionKind, key: string) {
  const [items, setItems] = useState<MediaCard[]>([]);
  const [total, setTotal] = useState(0);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (!key) return;
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const service = getUserData();
        if (kind === "status") {
          const page = await service.listByStatus(key as Parameters<typeof service.listByStatus>[0]);
          setItems(page.items.map(userStatusRecordToMediaCard));
          setTotal(page.total);
        } else {
          const page = await service.getFolderItems(key);
          setItems(page.items.map(userFolderItemToMediaCard));
          setTotal(page.total);
          setFolderName(page.folder.name || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [kind, key],
  );

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setFolderName(null);
    void load(true);
  }, [load]);

  return { items, total, folderName, loading, error, refetch: load };
}

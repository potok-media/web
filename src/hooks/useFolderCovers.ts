import { useEffect, useState } from "react";
import { useSettings } from "../context/AppSettingsContext";
import { ApiClient } from "../network/ApiClient";
import { posterSizeForQuality, resizeTmdbImage, resolveTmdbImageUrl } from "../utils/mediaUtils";
import { getUserData, type UserFolder } from "../utils/userData";
import { buildCoverCells, COVER_CELL_COUNT, type FolderCoverCell } from "../components/collections/mosaicModel";

/**
 * Fetches each folder's first items and maps them onto 2×2 cover mosaic cells. Lazy-tolerant:
 * folders that fail to load (or have no items) simply get no cells and render placeholders.
 * Refetches whenever the folder list identity changes (create/rename/delete refresh).
 */
export function useFolderCovers(folders: UserFolder[]): Record<string, FolderCoverCell[]> {
  const { bannerQuality } = useSettings();
  const [covers, setCovers] = useState<Record<string, FolderCoverCell[]>>({});

  useEffect(() => {
    let cancelled = false;
    const resolvePoster = (posterSrc?: string | null) =>
      resizeTmdbImage(resolveTmdbImageUrl(posterSrc, ApiClient.baseURL), posterSizeForQuality(bannerQuality));

    void Promise.all(
      folders.map(async (folder) => {
        try {
          const page = await getUserData().getFolderItems(folder.id, 1, COVER_CELL_COUNT);
          return [folder.id, buildCoverCells(page.items, resolvePoster)] as const;
        } catch {
          return [folder.id, []] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setCovers(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [folders, bannerQuality]);

  return covers;
}

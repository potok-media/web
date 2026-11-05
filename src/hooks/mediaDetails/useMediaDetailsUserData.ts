import { useCallback, useEffect, useState } from "react";
import { getUserData } from "../../utils/userData";
import type {
  MediaCard,
} from "../../network/ApiTypes";
import type { TitleStatus, UserDataMediaType, UserFolder } from "../../utils/userData";

interface UseMediaDetailsUserDataParams {
  media: MediaCard | null;
  tmdbId: string;
  /** null when the route carries an unknown media type — user data stays inert. */
  mediaType: UserDataMediaType | null;
  workId?: string;
  showHUD: (type: "success" | "error" | "info", message: string) => void;
  t: (key: string) => string;
}

/**
 * Status + folder ("подборки") state for the details hero action row. Same interaction contract
 * as useMediaDetailsSocialActions: optimistic local update, rollback + HUD on failure. Status
 * and folder membership are not part of the details payload, so no media refetch afterwards.
 */
export function useMediaDetailsUserData({
  media,
  tmdbId,
  mediaType,
  workId,
  showHUD,
  t,
}: UseMediaDetailsUserDataParams) {
  const [status, setStatus] = useState<TitleStatus | null>(null);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [membership, setMembership] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // Status is derived server-side from (stored status, watched count), so any history mutation
  // changes it — history actions call this to re-pull the effective status after their
  // reconciling refetch instead of guessing client-side.
  const refreshStatus = useCallback(async () => {
    if (!mediaType) return;
    try {
      const { status: next } = await getUserData().getStatus(tmdbId, mediaType);
      setStatus(next);
    } catch {
      /* user data is additive — a failure here must not block the details page */
    }
  }, [tmdbId, mediaType]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setStatus(null);
    setMembership({});
    if (!mediaType) return;
    void (async () => {
      try {
        const service = getUserData();
        const [statusResult, folderList] = await Promise.all([
          service.getStatus(tmdbId, mediaType),
          service.listFolders(),
        ]);
        if (cancelled) return;
        setStatus(statusResult.status);
        setFolders(folderList);
        // Membership is not denormalized onto the title — scan each folder's items lazily.
        const entries = await Promise.all(
          folderList.map(async (folder) => {
            try {
              const page = await service.getFolderItems(folder.id, 1, 100);
              const belongs = page.items.some(
                (item) => item.tmdbId === tmdbId && item.mediaType === mediaType,
              );
              return [folder.id, belongs] as const;
            } catch {
              return [folder.id, false] as const;
            }
          }),
        );
        if (!cancelled) setMembership(Object.fromEntries(entries));
      } catch {
        /* user data is additive — a failure here must not block the details page */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType]);

  const selectStatus = useCallback(
    async (nextStatus: TitleStatus | null) => {
      if (!mediaType) return;
      const previous = status;
      setStatus(nextStatus);
      try {
        const service = getUserData();
        if (nextStatus) {
          await service.setStatus({
            tmdbId,
            mediaType,
            status: nextStatus,
            ...(workId ? { workId } : {}),
            ...(media ? { label: media.title, posterPath: media.posterSrc } : {}),
          });
          showHUD("success", t("status.set"));
        } else {
          await service.clearStatus(tmdbId, mediaType);
          showHUD("success", t("status.removed"));
        }
      } catch {
        setStatus(previous);
        showHUD("error", t("status.error"));
      }
    },
    [status, tmdbId, mediaType, workId, media, showHUD, t],
  );

  const toggleFolder = useCallback(
    async (folderId: string) => {
      if (!mediaType) return;
      const previous = !!membership[folderId];
      setMembership((prev) => ({ ...prev, [folderId]: !previous }));
      try {
        const service = getUserData();
        if (previous) {
          await service.removeFolderItem(folderId, tmdbId, mediaType);
        } else {
          await service.addFolderItem(folderId, tmdbId, mediaType, media?.title);
        }
        showHUD("success", t(previous ? "folders.removed" : "folders.added"));
      } catch {
        setMembership((prev) => ({ ...prev, [folderId]: previous }));
        showHUD("error", t("folders.error"));
      }
    },
    [membership, tmdbId, mediaType, media, showHUD, t],
  );

  const createFolder = useCallback(
    async (name: string) => {
      const folder = await getUserData().createFolder(name);
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    [],
  );

  return { status, folders, membership, loaded, selectStatus, refreshStatus, toggleFolder, createFolder };
}

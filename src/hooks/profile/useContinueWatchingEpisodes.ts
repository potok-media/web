import { useEffect, useState } from "react";
import type { ContinueWatchingEpisodeItem } from "../../network/ApiTypes";
import { SyncApiClient } from "../../network/SyncApiClient";
import { listContinueCursors, continueCursorToEpisodeItem } from "../../utils/continueWatching";

/**
 * Episode-level continue-watching list for the profile rail: in-progress episode rows
 * (title groups by most recent activity, episodes ascending within a title), each carrying
 * its own per-episode resume payload. Guests have no server copy — they resolve to the
 * host-owned local ledger (episode coordinates from the saved cursors), and a failed fetch
 * degrades to the ledger instead of an empty rail.
 */
export function useContinueWatchingEpisodes(isAuth: boolean): { items: ContinueWatchingEpisodeItem[]; loading: boolean } {
  const [items, setItems] = useState<ContinueWatchingEpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const ledgerItems = () => listContinueCursors().map(continueCursorToEpisodeItem);

    void (async () => {
      try {
        const serverItems = await SyncApiClient.fetchContinueWatchingEpisodes();
        if (cancelled) return;
        setItems(serverItems.length > 0 ? serverItems : ledgerItems());
      } catch {
        if (!cancelled) setItems(ledgerItems());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  return { items, loading };
}

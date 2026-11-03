import { useEffect, useState } from "react";
import type { MediaCard } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";
import { listContinueCursors, continueCursorToMediaCard } from "../utils/continueWatching";
import { mergeLedgerLastSource, cardProgressFromResume } from "../utils/continueWatchingResume";

/**
 * Server-driven continue-watching list for the profile rail and hero. Guests resolve straight
 * to the host-owned local ledger (SyncApiClient's guest fallback). Authenticated users get the
 * hydrated server cards; rows whose server save predates lastSource are patched from the local
 * ledger (TODO(lastSource-backfill): drop that bridge once backfilled), and a failed fetch
 * degrades to the ledger instead of an empty rail.
 */
export function useContinueWatchingCards(isAuth: boolean): { cards: MediaCard[]; loading: boolean } {
  const [cards, setCards] = useState<MediaCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const ledgerCards = () => listContinueCursors().map(continueCursorToMediaCard);

    void (async () => {
      try {
        const serverCards = await SyncApiClient.fetchContinueWatching();
        if (cancelled) return;
        if (!isAuth) {
          setCards(serverCards);
        } else {
          const merged = serverCards.length > 0
            ? mergeLedgerLastSource(serverCards, listContinueCursors())
            : ledgerCards();
          setCards(merged.map(cardProgressFromResume));
        }
      } catch {
        if (!cancelled) setCards(ledgerCards());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  return { cards, loading };
}

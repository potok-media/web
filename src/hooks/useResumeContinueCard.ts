import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { MediaCard } from "../network/ApiTypes";
import { mediaCardLink } from "../utils/mediaLink";
import {
  findLedgerCursorForCard,
  isCardResumable,
  resumeCursorFromCard,
} from "../utils/continueWatchingResume";
import { listContinueCursors } from "../utils/continueWatching";
import { useResumeContinueWatching } from "./useResumeContinueWatching";

/**
 * Card-level resume used by the profile hero and rail. The card's saved lastSource resumes
 * through the owning source plugin (torrents by streamHash/fileIndex, online by sourceStream);
 * a card without one falls back to the matching local ledger cursor (rows saved before the
 * player attached lastSource), and only then to opening the title page.
 */
export function useResumeContinueCard(): (card: MediaCard) => void {
  const navigate = useNavigate();
  const { resume } = useResumeContinueWatching();

  return useCallback(
    (card: MediaCard) => {
      if (isCardResumable(card)) {
        const cursor = resumeCursorFromCard(card);
        if (cursor) {
          void resume(cursor);
          return;
        }
      }
      const ledgerCursor = findLedgerCursorForCard(card, listContinueCursors());
      if (ledgerCursor?.providerId) {
        void resume(ledgerCursor);
        return;
      }
      navigate(mediaCardLink(card));
    },
    [navigate, resume],
  );
}

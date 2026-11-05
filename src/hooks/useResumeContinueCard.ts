import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { MediaCard } from "../network/ApiTypes";
import { mediaCardLink } from "../utils/mediaLink";
import {
  findLedgerCursorForCard,
  isCardResumable,
  resumeCursorFromCard,
} from "../utils/continueWatchingResume";
import {
  videoSettingsFromCard,
  videoSettingsFromCursor,
} from "../utils/videoSettings";
import { listContinueCursors } from "../utils/continueWatching";
import { useResumeContinueWatching } from "./useResumeContinueWatching";

/**
 * Card-level resume used by the profile hero and rail. Every resumable source — torrent or
 * online — becomes a video-settings snapshot and lands on /continue-watch, the single restore
 * surface; only rows too old to carry a source descriptor fall back to the legacy sandbox
 * resume (or opening the title page when nothing is known).
 */
export function useResumeContinueCard(): (card: MediaCard) => void {
  const navigate = useNavigate();
  const { resume } = useResumeContinueWatching();

  return useCallback(
    (card: MediaCard) => {
      if (isCardResumable(card)) {
        const snapshot = videoSettingsFromCard(card);
        if (snapshot) {
          navigate("/continue-watch", { state: { snapshot } });
          return;
        }
        const cursor = resumeCursorFromCard(card);
        if (cursor) {
          void resume(cursor);
          return;
        }
      }
      const ledgerCursor = findLedgerCursorForCard(card, listContinueCursors());
      const ledgerSnapshot = ledgerCursor ? videoSettingsFromCursor(ledgerCursor) : null;
      if (ledgerSnapshot) {
        navigate("/continue-watch", { state: { snapshot: ledgerSnapshot } });
        return;
      }
      if (ledgerCursor?.providerId) {
        void resume(ledgerCursor);
        return;
      }
      navigate(mediaCardLink(card));
    },
    [navigate, resume],
  );
}

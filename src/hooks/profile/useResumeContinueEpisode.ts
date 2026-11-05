import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ContinueWatchingEpisodeItem } from "../../network/ApiTypes";
import { listContinueCursors } from "../../utils/continueWatching";
import { videoSettingsFromCard, videoSettingsFromCursor } from "../../utils/videoSettings";
import { mediaCardLink } from "../../utils/mediaLink";
import { useResumeContinueWatching } from "../useResumeContinueWatching";

/**
 * Episode-level resume for the profile continue rail. The snapshot is derived from the
 * EPISODE item's own resume payload (that history row's last_source + coordinates), so
 * clicking episode N restores episode N at its position. Only rows without any source
 * descriptor fall back: first the matching local-ledger cursor, then the title page.
 */
export function useResumeContinueEpisode(): (item: ContinueWatchingEpisodeItem) => void {
  const navigate = useNavigate();
  const { resume } = useResumeContinueWatching();

  return useCallback(
    (item: ContinueWatchingEpisodeItem) => {
      if (item.resume?.lastSource?.providerId) {
        const snapshot = videoSettingsFromCard(item);
        if (snapshot) {
          navigate("/continue-watch", { state: { snapshot } });
          return;
        }
      }
      const ledgerCursor = listContinueCursors().find(
        (cursor) =>
          cursor.tmdbId === item.id &&
          (item.seasonNumber == null ||
            (cursor.season === item.seasonNumber && cursor.episode === item.episodeNumber)),
      );
      const ledgerSnapshot = ledgerCursor ? videoSettingsFromCursor(ledgerCursor) : null;
      if (ledgerSnapshot) {
        navigate("/continue-watch", { state: { snapshot: ledgerSnapshot } });
        return;
      }
      if (ledgerCursor?.providerId) {
        void resume(ledgerCursor);
        return;
      }
      navigate(mediaCardLink({ id: item.id, mediaType: item.mediaType }));
    },
    [navigate, resume],
  );
}

import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useContinueWatchingCursors } from "../utils/continueWatching";
import { continueCursorToMediaCard } from "../utils/continueWatching";
import { useResumeContinueWatching } from "../hooks/useResumeContinueWatching";
import { videoSettingsFromCursor } from "../utils/videoSettings";
import type { MediaCard } from "../network/ApiTypes";
import { MediaCardComponent } from "./MediaCardComponent";
import { ScrollView } from "./common/ScrollView";
import { mediaCardKey } from "../utils/mediaLink";

/**
 * Native host "Continue watching" home row — the cross-source ledger rendered with the standard
 * media cards (episode pill + watch-progress bar). Renders nothing while the ledger is empty.
 */
export const ContinueWatchingRow: React.FC = () => {
  const { t } = useTranslation("media");
  const navigate = useNavigate();
  const cursors = useContinueWatchingCursors();
  const { resume } = useResumeContinueWatching();

  const entries = useMemo(
    () => cursors.map((cursor) => ({ cursor, card: continueCursorToMediaCard(cursor) })),
    [cursors],
  );

  const handleCardClick = useCallback(
    (item: MediaCard) => {
      const entry = entries.find((e) => e.card === item);
      if (!entry) return;
      const snapshot = videoSettingsFromCursor(entry.cursor);
      if (snapshot) {
        navigate("/continue-watch", { state: { snapshot } });
        return;
      }
      void resume(entry.cursor);
    },
    [entries, navigate, resume],
  );

  if (!entries.length) return null;

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <h2 className="carousel-title">{t("home.continueWatching")}</h2>
      </div>
      <ScrollView
        orientation="horizontal"
        className="carousel-viewport"
        renderTrack={({ trackProps }) => (
          <div className={`carousel-row ${trackProps.className}`}>
            {entries.map(({ card }) => (
              <MediaCardComponent
                key={mediaCardKey(card)}
                item={card}
                onClick={handleCardClick}
                showContinueOverlay
              />
            ))}
          </div>
        )}
      />
    </div>
  );
};

export default ContinueWatchingRow;

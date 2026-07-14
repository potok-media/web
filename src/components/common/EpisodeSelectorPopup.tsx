import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Overlay } from "./Overlay";
import { EpisodeSelectorHeader } from "./episodeSelector/EpisodeSelectorHeader";
import { EpisodeOverridePicker } from "./episodeSelector/EpisodeOverridePicker";
import { EpisodeSelectorBody } from "./episodeSelector/EpisodeSelectorBody";
import { useEpisodeSelectorState } from "../../hooks/useEpisodeSelectorState";
import type { EpisodeSelectorPopupProps } from "./episodeSelector/types";

export type { GenericEpisodeItem } from "./episodeSelector/types";

export const EpisodeSelectorPopup: React.FC<EpisodeSelectorPopupProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  episodes = [],
  onPlay,
  onStartEditing,
  onApplyOverride,
  onResetOverride,
  fileOverrideEnabled = false,
  fileMap = {},
  onApplyFileOverride,
  onResetFileOverride,
  seasonMap = {},
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  tmdbSeasonsCount,
  parsingSuspect,
  backdropSrc,
  posterSrc,
  mediaType = "tv",
}) => {
  const { t } = useTranslation("media");

  const {
    isEditing,
    sourceSections,
    firstEpId,
    completedCount,
    totalCount,
    percentage,
    handleEditSection,
    handleEditFile,
    handleCancelEditing,
    handleApplyOverrideInternal,
    handleOpenAsPlaylist,
  } = useEpisodeSelectorState({
    isOpen,
    episodes,
    onPlay,
    onStartEditing,
    onApplyOverride,
    onApplyFileOverride,
  });

  const uniqueSeasons = useMemo(
    () => Array.from(new Set(episodes.map((e) => e.season))),
    [episodes],
  );
  const tmdbCount = tmdbSeasonsCount || 1;
  const maxSeasonInBalancer = uniqueSeasons.length > 0 ? Math.max(...uniqueSeasons) : 1;
  // Overparse: a file parsed into a season number the show doesn't have.
  const overparsed = maxSeasonInBalancer > tmdbCount;
  // All files collapsed into specials (season 0) for a TV show — usually a mis-detected "special" token
  // (NC*/SP/OVA…) swallowing normal episodes, which would otherwise silently hide the parse failure. TV only:
  // season 0 is the legitimate, expected bucket for movies.
  const allSpecials =
    mediaType === "tv" && uniqueSeasons.length > 0 && uniqueSeasons.every((s) => s === 0);
  // The plugin's verdict (it owns the parser + the release title) is authoritative when given; the numeric
  // heuristics below stay as a generic safety net for plugins that don't report one.
  const parsingFailed = (parsingSuspect ?? false) || overparsed || allSpecials;

  return (
    <Overlay
      open={isOpen}
      onClose={onClose}
      styled={false}
      backdropClassName="modal-overlay"
      className={`modal-container ${isEditing ? "modal-container-editing" : "modal-container-files"}`}
    >
      <EpisodeSelectorHeader
        isEditing={isEditing}
        onClose={onClose}
        onBackToFiles={handleCancelEditing}
        title={title}
        subtitle={subtitle}
        mediaType={mediaType}
        completedCount={completedCount}
        totalCount={totalCount}
        percentage={percentage}
        parsingFailed={parsingFailed}
        onOpenAsPlaylist={handleOpenAsPlaylist}
      />

      <div className="episode-popup-body episode-popup-body-flex">
        {isEditing ? (
          <EpisodeOverridePicker
            seasons={seasons}
            seasonsLoading={seasonsLoading}
            onApplyOverride={handleApplyOverrideInternal}
          />
        ) : (
          <EpisodeSelectorBody
            mediaType={mediaType}
            totalCount={totalCount}
            sourceSections={sourceSections}
            seasonMap={seasonMap}
            firstEpId={firstEpId}
            backdropSrc={backdropSrc}
            posterSrc={posterSrc}
            onPlay={(ep) => onPlay(ep, "default")}
            onEditSection={handleEditSection}
            onResetOverride={onResetOverride}
            fileOverrideEnabled={fileOverrideEnabled}
            fileMap={fileMap}
            onEditFile={handleEditFile}
            onResetFileOverride={onResetFileOverride}
          />
        )}

        {isSaving && (
          <div className="saving-overlay">
            <div className="saving-content">
              <div className="premium-spinner picker-spinner-margin">
                <div className="spinner-outer" />
                <div className="spinner-inner" />
              </div>
              <span>{t("selector.savingOffset")}</span>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
};

export default EpisodeSelectorPopup;
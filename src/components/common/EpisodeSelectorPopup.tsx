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
  seasonMap = {},
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  tmdbSeasonsCount,
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
    handleCancelEditing,
    handleApplyOverrideInternal,
    handleOpenAsPlaylist,
  } = useEpisodeSelectorState({
    isOpen,
    episodes,
    onPlay,
    onStartEditing,
    onApplyOverride,
  });

  const uniqueSeasons = useMemo(
    () => Array.from(new Set(episodes.map((e) => e.season))),
    [episodes],
  );
  const tmdbCount = tmdbSeasonsCount || 1;
  const maxSeasonInBalancer = uniqueSeasons.length > 0 ? Math.max(...uniqueSeasons) : 1;
  const parsingFailed = maxSeasonInBalancer > tmdbCount;

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
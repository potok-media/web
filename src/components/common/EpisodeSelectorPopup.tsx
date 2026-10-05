import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Overlay } from "./Overlay";
import { Button } from "../ui";
import { EpisodeSelectorHeader } from "./episodeSelector/EpisodeSelectorHeader";
import { EpisodeOverridePicker } from "./episodeSelector/EpisodeOverridePicker";
import { EpisodeSelectorBody } from "./episodeSelector/EpisodeSelectorBody";
import { useEpisodeSelectorState } from "../../hooks/useEpisodeSelectorState";
import type { EpisodeSelectorPopupProps, GenericEpisodeItem } from "./episodeSelector/types";
import { hasEpisodeParsingWarning } from "./episodeSelector/utils";

export type { GenericEpisodeItem } from "./episodeSelector/types";

export const EpisodeSelectorPopup: React.FC<EpisodeSelectorPopupProps> = ({
  isOpen,
  accessibleModal = false,
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
  armLayout,
  armLayoutLoading = false,
  armLayoutError,
  onRetryArmLayout,
  onApplyEpisodeBinding,
  seasonMap = {},
  seasons = [],
  seasonsLoading = false,
  isSaving = false,
  parsingSuspect,
  backdropSrc,
  posterSrc,
  mediaType = "tv",
}) => {
  const { t } = useTranslation("media");
  const canonicalBindingEnabled = Boolean(onApplyEpisodeBinding);

  const {
    isEditing,
    editingFile,
    sourceSections,
    firstEpId,
    completedCount,
    totalCount,
    percentage,
    handleEditSection,
    handleEditFile,
    handleCancelEditing,
    handleApplyOverrideInternal,
    handleApplyEpisodeBinding,
    handleOpenAsPlaylist,
  } = useEpisodeSelectorState({
    isOpen,
    episodes,
    onPlay,
    onStartEditing,
    onApplyOverride,
    onApplyFileOverride,
    onApplyEpisodeBinding,
  });

  const handlePlay = useCallback(
    (ep: GenericEpisodeItem) => onPlay(ep, "default"),
    [onPlay],
  );

  // TMDB's season count is metadata, not a topology constraint. Only explicit parser evidence and the
  // all-specials safety check can raise this warning.
  const parsingFailed = useMemo(
    () => hasEpisodeParsingWarning({ episodes, mediaType, parserVerdict: parsingSuspect }),
    [episodes, mediaType, parsingSuspect],
  );

  return (
    <Overlay
      accessibleModal={accessibleModal}
      ariaLabel={title}
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
        onOpenAsPlaylist={handleOpenAsPlaylist}
      />

      {parsingFailed && !isEditing && (
        <div className="parsing-hint-strip" title={t("selector.parsingHintBody")}>
          <AlertTriangle size="0.8125rem" />
          <span className="parsing-hint-text">{t("selector.parsingHintQuestion")}</span>
          <Button
            variant="ghost"
            className="parsing-hint-action"
            onClick={() => {
              if (sourceSections.length > 0) handleEditSection(sourceSections[0]);
              else onStartEditing?.();
            }}
          >
            {t("selector.parsingHintAction")}
          </Button>
        </div>
      )}

      <div className="episode-popup-body episode-popup-body-flex">
        {isEditing ? (
          <EpisodeOverridePicker
            seasons={seasons}
            seasonsLoading={seasonsLoading}
            onApplyOverride={handleApplyOverrideInternal}
            canonicalBindingEnabled={canonicalBindingEnabled}
            armLayout={armLayout}
            armLayoutLoading={armLayoutLoading}
            armLayoutError={armLayoutError}
            onRetryArmLayout={onRetryArmLayout}
            onApplyEpisodeBinding={handleApplyEpisodeBinding}
            overrideMode={editingFile?.mode ?? "anchor"}
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
            onPlay={handlePlay}
            onEditSection={handleEditSection}
            onResetOverride={onResetOverride}
            fileOverrideEnabled={fileOverrideEnabled}
            fileMap={fileMap}
            onEditFile={handleEditFile}
            onResetFileOverride={onResetFileOverride}
            canonicalBindingEnabled={canonicalBindingEnabled}
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

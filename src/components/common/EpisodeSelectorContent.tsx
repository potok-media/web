import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Pencil } from "lucide-react";
import { Button } from "../ui";
import { EpisodeSelectorHeader } from "./episodeSelector/EpisodeSelectorHeader";
import { EpisodeOverridePicker } from "./episodeSelector/EpisodeOverridePicker";
import { EpisodeSelectorBody } from "./episodeSelector/EpisodeSelectorBody";
import { useEpisodeSelectorState } from "../../hooks/useEpisodeSelectorState";
import type { EpisodeSelectorPopupProps, EpisodeSelectorPresentation } from "./episodeSelector/types";
import { hasEpisodeParsingWarning } from "./episodeSelector/utils";

export interface EpisodeSelectorContentProps
  extends Omit<EpisodeSelectorPopupProps, "accessibleModal"> {
  navigationAction?: "back" | "close";
  busyLabel?: string;
  presentation?: EpisodeSelectorPresentation;
  activeEpisodeId?: string;
  hideHeader?: boolean;
}

export const EpisodeSelectorContent: React.FC<EpisodeSelectorContentProps> = ({
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
  navigationAction = "close",
  busyLabel,
  presentation = "selector",
  activeEpisodeId,
  hideHeader = false,
}) => {
  const { t } = useTranslation("media");
  const canonicalBindingEnabled = Boolean(onApplyEpisodeBinding);
  const [repairMode, setRepairMode] = useState(false);

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
    handlePlayAsPlaylist,
  } = useEpisodeSelectorState({
    isOpen,
    episodes,
    onPlay,
    onStartEditing,
    onApplyOverride,
    onApplyFileOverride,
    onApplyEpisodeBinding,
  });

  const parsingFailed = useMemo(
    () => hasEpisodeParsingWarning({ episodes, mediaType, parserVerdict: parsingSuspect }),
    [episodes, mediaType, parsingSuspect],
  );

  useEffect(() => {
    if (!isOpen) setRepairMode(false);
  }, [isOpen]);

  const handleStartRepairing = () => {
    setRepairMode(true);
    onStartEditing?.();
  };

  const handleStopRepairing = () => {
    handleCancelEditing();
    setRepairMode(false);
  };
  const startEditingAction = presentation === "playlist" && onStartEditing
    ? handleStartRepairing
    : onStartEditing;

  return (
    <div
      className={`episode-selector-content ${isEditing ? "episode-selector-content--editing" : "episode-selector-content--files"} ${presentation === "playlist" ? "episode-selector-content--playlist" : ""} ${repairMode ? "episode-selector-content--repair" : ""}`}
    >
      {(!hideHeader || isEditing || repairMode) && (
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
          onStartEditing={startEditingAction}
          navigationAction={navigationAction}
          presentation={presentation}
          repairMode={repairMode}
          onStopRepairing={handleStopRepairing}
        />
      )}

      {hideHeader && !isEditing && !repairMode && onStartEditing && (
        <div className="episode-selector-rail-tools">
          <Button variant="ghost" size="sm" onClick={handleStartRepairing}>
            <Pencil size="0.875rem" />
            <span>{t("selector.editMapping")}</span>
          </Button>
        </div>
      )}

      {parsingFailed && !isEditing && !repairMode && (
        <div className="parsing-hint-strip" title={t("selector.parsingHintBody")}>
          <AlertTriangle size="0.8125rem" />
          <span className="parsing-hint-text">{t("selector.parsingHintQuestion")}</span>
          <Button
            variant="ghost"
            className="parsing-hint-action"
            onClick={() => {
              if (presentation === "playlist") setRepairMode(true);
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
            onPlay={handlePlayAsPlaylist}
            onEditSection={handleEditSection}
            onResetOverride={onResetOverride}
            fileOverrideEnabled={fileOverrideEnabled}
            fileMap={fileMap}
            onEditFile={handleEditFile}
            onResetFileOverride={onResetFileOverride}
            canonicalBindingEnabled={canonicalBindingEnabled}
            presentation={presentation}
            repairMode={repairMode}
            activeEpisodeId={activeEpisodeId}
          />
        )}

        {isSaving && (
          <div className="saving-overlay">
            <div className="saving-content">
              <div className="premium-spinner picker-spinner-margin">
                <div className="spinner-outer" />
                <div className="spinner-inner" />
              </div>
              <span>{busyLabel || t("selector.savingOffset")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EpisodeSelectorContent;

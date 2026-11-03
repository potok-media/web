import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, RotateCcw } from "lucide-react";
import { EpisodeSelectorRow } from "./EpisodeSelectorRow";
import { IconButton } from "../../ui";
import type {
  EpisodeSelectorPresentation,
  EpisodeSourceSection,
  FileOverrideEntry,
  FileOverrideMode,
  GenericEpisodeItem,
} from "./types";
import { SENTINEL_KEY } from "./utils";
import { sectionBindingAnchorIds } from "./armOverrideModel";
import { groupKindLabel } from "../../seasonGroupLabels";

interface EpisodeSelectorBodyProps {
  mediaType: string;
  totalCount: number;
  sourceSections: EpisodeSourceSection[];
  playlistEpisodes?: EpisodeSourceSection["episodes"];
  seasonMap: Record<string, { season: number; offset: number }>;
  firstEpId?: string;
  backdropSrc?: string;
  posterSrc?: string;
  onPlay: (episode: EpisodeSourceSection["episodes"][number]) => void;
  onEditSection: (section: EpisodeSourceSection) => void;
  onResetOverride?: (sourceSeason: number | null) => void;
  fileOverrideEnabled?: boolean;
  fileMap?: Record<string, FileOverrideEntry>;
  onEditFile?: (fileId: string, mode: FileOverrideMode) => void;
  onResetFileOverride?: (fileId: string) => void;
  canonicalBindingEnabled?: boolean;
  presentation?: EpisodeSelectorPresentation;
  repairMode?: boolean;
  activeEpisodeId?: string;
  playbackBlocked?: boolean;
  canReorder?: boolean;
  onReorderEpisode?: (sourceId: string, targetId: string) => void;
}

export const EpisodeSelectorBody: React.FC<EpisodeSelectorBodyProps> = ({
  mediaType,
  totalCount,
  sourceSections,
  playlistEpisodes = [],
  seasonMap,
  backdropSrc,
  posterSrc,
  onPlay,
  onEditSection,
  onResetOverride,
  fileOverrideEnabled = false,
  fileMap = {},
  onEditFile,
  onResetFileOverride,
  canonicalBindingEnabled = false,
  presentation = "selector",
  repairMode = false,
  activeEpisodeId,
  playbackBlocked = false,
  canReorder = false,
  onReorderEpisode,
}) => {
  const { t } = useTranslation("media");
  const [draggedEpisodeId, setDraggedEpisodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const showTechnicalControls = presentation !== "playlist" || repairMode;
  const mappingEnabled = fileOverrideEnabled || canonicalBindingEnabled;
  // The queue panel annotates the active row («Играет») and the one after it («Дальше») — the row
  // component renders the caption from playbackStatus, so derive it from the playlist order here.
  const isQueuePlaylist = presentation === "playlist" && !repairMode;
  const activeQueueIndex = isQueuePlaylist && activeEpisodeId
    ? playlistEpisodes.findIndex((episode) => episode.id === activeEpisodeId)
    : -1;

  const renderEpisode = (ep: EpisodeSourceSection["episodes"][number]) => {
    const queueIndex = isQueuePlaylist ? playlistEpisodes.findIndex((episode) => episode.id === ep.id) : -1;
    const queueStatus = isQueuePlaylist && queueIndex >= 0 && activeQueueIndex >= 0
      ? queueIndex === activeQueueIndex
        ? "playing" as const
        : queueIndex === activeQueueIndex + 1
          ? "next" as const
          : undefined
      : undefined;
    const rowItem: GenericEpisodeItem = queueStatus ? { ...ep, playbackStatus: queueStatus } : ep;
    return (
    <EpisodeSelectorRow
      key={ep.id}
      episodeItem={rowItem}
      mediaType={mediaType}
      backdropSrc={backdropSrc}
      posterSrc={posterSrc}
      onPlay={onPlay}
      fileOverrideEnabled={mappingEnabled}
      fileOverride={fileMap[ep.id]}
      onEditFile={mappingEnabled ? onEditFile : undefined}
      onResetFileOverride={onResetFileOverride}
      presentation={presentation}
      repairMode={repairMode}
      isActive={activeEpisodeId === ep.id}
      playbackBlocked={playbackBlocked}
      canReorder={canReorder}
      isDragging={draggedEpisodeId === ep.id}
      isDropTarget={dropTargetId === ep.id && draggedEpisodeId !== ep.id}
      onDragStart={() => setDraggedEpisodeId(ep.id)}
      onDragOver={() => setDropTargetId(ep.id)}
      onDrop={() => {
        if (draggedEpisodeId && draggedEpisodeId !== ep.id) {
          onReorderEpisode?.(draggedEpisodeId, ep.id);
        }
        setDraggedEpisodeId(null);
        setDropTargetId(null);
      }}
      onDragEnd={() => {
        setDraggedEpisodeId(null);
        setDropTargetId(null);
      }}
      onMoveByKeyboard={(direction) => {
        const index = playlistEpisodes.findIndex((episode) => episode.id === ep.id);
        const target = playlistEpisodes[index + direction];
        if (target) onReorderEpisode?.(ep.id, target.id);
      }}
    />
    );
  };

  return (
    <div className="files-list-container episode-files-list">
      <div className="episode-popup-rows-list episode-popup-rows-scroll">
        {totalCount > 0 && presentation === "playlist" && !repairMode ? (
          <div className="episode-playlist-flat">{playlistEpisodes.map(renderEpisode)}</div>
        ) : totalCount > 0 ? (
          sourceSections.map((section) => {
            const srcRaw = section.rawSeason;
            const mapEntry = seasonMap[srcRaw === undefined ? SENTINEL_KEY : String(srcRaw)];
            const bindingAnchorIds = canonicalBindingEnabled ? sectionBindingAnchorIds(section, fileMap) : [];
            return (
              <div key={section.key} className="episode-season-group">
                {(mediaType === "tv" || canonicalBindingEnabled) && (
                  <div className="season-section-header">
                    <h3 className="season-section-title">
                      {section.groupTitle || (section.unresolved
                        ? t("selector.unresolved")
                        : section.groupKind && section.groupKind !== "season"
                        ? groupKindLabel(section.groupKind, t)
                        : section.displayedSeason === 0
                        ? t("selector.specials")
                        : section.displayedSeason !== undefined
                          ? t("selector.season", { number: section.displayedSeason })
                          : t("selector.episodeGroup"))}
                    </h3>
                    {showTechnicalControls && mapEntry && (
                      <span className="season-map-badge">
                        {srcRaw !== undefined && srcRaw !== section.displayedSeason
                          ? `S${srcRaw}→ `
                          : ""}
                        {mapEntry.offset >= 0 ? "+" : ""}
                        {mapEntry.offset}
                      </span>
                    )}
                    {showTechnicalControls && (
                      <IconButton
                        className="season-edit-pencil"
                        onClick={() => onEditSection(section)}
                        aria-label={t(canonicalBindingEnabled ? "selector.editMapping" : "selector.editSeasonMapping")}
                      >
                        <Pencil size="0.9375rem" />
                      </IconButton>
                    )}
                    {showTechnicalControls && canonicalBindingEnabled && onResetFileOverride && bindingAnchorIds.map((anchorId) => (
                      <IconButton
                        key={anchorId}
                        className="season-edit-pencil"
                        onClick={() => onResetFileOverride(anchorId)}
                        aria-label={t("selector.resetSeasonMapping")}
                      >
                        <RotateCcw size="0.9375rem" />
                      </IconButton>
                    ))}
                    {showTechnicalControls && mapEntry && onResetOverride && (
                      <IconButton
                        className="season-edit-pencil"
                        onClick={() => onResetOverride(srcRaw ?? null)}
                        aria-label={t("selector.resetSeasonMapping")}
                      >
                        <RotateCcw size="0.9375rem" />
                      </IconButton>
                    )}
                  </div>
                )}
                {section.episodes.map(renderEpisode)}
              </div>
            );
          })
        ) : (
          <div className="episode-popup-empty-files">{t("selector.noEpisodes")}</div>
        )}
      </div>
    </div>
  );
};

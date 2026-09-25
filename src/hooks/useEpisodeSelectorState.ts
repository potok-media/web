import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaylistItem } from "../context/playbackTypes";
import type { EpisodeSourceSection, FileOverrideMode, GenericEpisodeItem } from "../components/common/episodeSelector/types";
import { buildEpisodeSourceSections, resolvedSeasonNumbers } from "../components/common/episodeSelector/utils";
import { buildEpisodeBindingOverride } from "../components/common/episodeSelector/armOverrideModel";
import type { SDKArmBindingTarget, SDKEpisodeBindingOverride } from "../sdk/src/types";

interface PlaylistOverrideBridge {
  potok_playlist_override?: PlaylistItem[];
}

interface UseEpisodeSelectorStateParams {
  isOpen: boolean;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  onStartEditing?: () => void;
  onApplyOverride?: (sourceSeason: number | null, targetSeason: number, offset: number) => void;
  onApplyFileOverride?: (fileId: string, season: number, episode: number, mode: FileOverrideMode) => void;
  onApplyEpisodeBinding?: (override: SDKEpisodeBindingOverride) => void;
}

export function useEpisodeSelectorState({
  isOpen,
  episodes,
  onPlay,
  onStartEditing,
  onApplyOverride,
  onApplyFileOverride,
  onApplyEpisodeBinding,
}: UseEpisodeSelectorStateParams) {
  const { t } = useTranslation("media");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSource, setEditingSource] = useState<{
    sourceSeason: number | null;
    rawFirstEp: number;
    sectionKey: string;
  } | null>(null);
  // When set, the target picker applies a per-FILE override (anchor/pin) instead of a per-season one.
  const [editingFile, setEditingFile] = useState<{ id: string; mode: FileOverrideMode } | null>(null);

  const uniqueSeasons = useMemo(
    () => resolvedSeasonNumbers(episodes),
    [episodes],
  );

  const sourceSections = useMemo<EpisodeSourceSection[]>(
    () => buildEpisodeSourceSections(episodes),
    [episodes],
  );

  const firstEpId = useMemo(() => sourceSections[0]?.episodes[0]?.id, [sourceSections]);

  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [uniqueSeasons, selectedSeason]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setEditingSource(null);
      setEditingFile(null);
    }
  }, [isOpen]);

  const handleEditSection = useCallback(
    (section: EpisodeSourceSection) => {
      setEditingFile(null);
      setEditingSource({ sourceSeason: section.rawSeason ?? null, rawFirstEp: section.rawFirstEp, sectionKey: section.key });
      setIsEditing(true);
      onStartEditing?.();
    },
    [onStartEditing],
  );

  // Start a per-FILE override: the target picker's next pick maps THIS file (anchor = renumber the run from
  // here; pin = fix just this file).
  const handleEditFile = useCallback(
    (fileId: string, mode: FileOverrideMode) => {
      setEditingSource(null);
      setEditingFile({ id: fileId, mode });
      setIsEditing(true);
      onStartEditing?.();
    },
    [onStartEditing],
  );

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingSource(null);
    setEditingFile(null);
  }, []);

  const handleApplyOverrideInternal = useCallback(
    (targetSeason: number, targetEp: number) => {
      if (editingFile) {
        onApplyFileOverride?.(editingFile.id, targetSeason, targetEp, editingFile.mode);
      } else if (onApplyOverride) {
        const rawFirstEp = editingSource?.rawFirstEp ?? 1;
        onApplyOverride(
          editingSource?.sourceSeason ?? null,
          targetSeason,
          targetEp - rawFirstEp,
        );
      }
      setSelectedSeason(targetSeason);
      setEditingSource(null);
      setEditingFile(null);
      setIsEditing(false);
    },
    [editingSource, editingFile, onApplyOverride, onApplyFileOverride],
  );

  const handleOpenAsPlaylist = useCallback(() => {
    if (!episodes.length) return;

    const getStreamUrl = (ep: GenericEpisodeItem) =>
      ep.url || ep.audios?.[0]?.url || "";

    const mappedPlaylist: PlaylistItem[] = episodes
      .map((ep) => {
        const streamUrl = getStreamUrl(ep);
        return {
          id: ep.id,
          workId: ep.workId,
          episodeId: ep.episodeId,
          orderingId: ep.orderingId,
          groupId: ep.groupId,
          episodeIds: ep.episodeIds,
          targets: ep.targets,
          season: ep.season,
          episode: ep.episode,
          title: ep.title || ep.fileName || (ep.episode !== undefined
            ? t("episode.fallbackName", { number: ep.episode })
            : t("selector.unresolvedEpisode")),
          streamUrl,
          streamType: (streamUrl.includes(".m3u8")
            ? "m3u8"
            : streamUrl.includes(".mpd")
              ? "dash"
              : "mp4") as PlaylistItem["streamType"],
          audios: ep.audios?.map((a) => ({ name: a.name, url: a.url || "" })),
          voice: ep.audios?.[0]?.name || t("selector.mainStream"),
        };
      })
      .filter((item) => !!item.streamUrl);

    if (!mappedPlaylist.length) return;

    (window as PlaylistOverrideBridge).potok_playlist_override = mappedPlaylist;

    const uncompleted =
      episodes.find((e) => e.season === selectedSeason && !e.isWatched) ||
      episodes.find((e) => !e.isWatched) ||
      episodes.find((e) => e.season === selectedSeason) ||
      episodes[0];

    if (uncompleted) {
      onPlay(uncompleted, "default");
    }
  }, [episodes, onPlay, selectedSeason, t]);

  const handleApplyEpisodeBinding = useCallback((target: SDKArmBindingTarget) => {
    if (!onApplyEpisodeBinding) return;
    const override = buildEpisodeBindingOverride({
      target,
      sections: sourceSections,
      editingFile,
      editingSectionKey: editingSource?.sectionKey,
    });
    if (!override) return;
    onApplyEpisodeBinding(override);
    handleCancelEditing();
  }, [onApplyEpisodeBinding, sourceSections, editingFile, editingSource, handleCancelEditing]);

  const completedCount = episodes.filter((e) => e.isWatched).length;
  const totalCount = episodes.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
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
  };
}

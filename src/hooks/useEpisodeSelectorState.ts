import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaylistItem } from "../context/playbackTypes";
import type { EpisodeSourceSection, FileOverrideMode, GenericEpisodeItem } from "../components/common/episodeSelector/types";
import { buildEpisodeSourceSections } from "../components/common/episodeSelector/utils";
import { buildEpisodeBindingOverride } from "../components/common/episodeSelector/armOverrideModel";
import type { SDKArmBindingTarget, SDKEpisodeBindingOverride } from "../sdk/src/types";
import { buildEpisodePlaylist } from "../utils/episodePlaylist";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editingSource, setEditingSource] = useState<{
    sourceSeason: number | null;
    rawFirstEp: number;
    sectionKey: string;
  } | null>(null);
  // When set, the target picker applies a per-FILE override (anchor/pin) instead of a per-season one.
  const [editingFile, setEditingFile] = useState<{ id: string; mode: FileOverrideMode } | null>(null);

  const sourceSections = useMemo<EpisodeSourceSection[]>(
    () => buildEpisodeSourceSections(episodes),
    [episodes],
  );

  const firstEpId = useMemo(() => sourceSections[0]?.episodes[0]?.id, [sourceSections]);

  const playlist = useMemo(
    () => buildEpisodePlaylist(episodes, {
      fallbackEpisodeTitle: (episode) => t("episode.fallbackName", { number: episode }),
      unresolvedTitle: t("selector.unresolvedEpisode"),
      mainStreamTitle: t("selector.mainStream"),
    }),
    [episodes, t],
  );

  useEffect(() => {
    if (!isOpen || playlist.length === 0) return;

    const bridge = window as PlaylistOverrideBridge;
    bridge.potok_playlist_override = playlist;

    return () => {
      if (bridge.potok_playlist_override === playlist) {
        bridge.potok_playlist_override = undefined;
      }
    };
  }, [isOpen, playlist]);

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
      setEditingSource(null);
      setEditingFile(null);
      setIsEditing(false);
    },
    [editingSource, editingFile, onApplyOverride, onApplyFileOverride],
  );

  const handlePlayAsPlaylist = useCallback((episode: GenericEpisodeItem) => {
    if (playlist.length > 0) {
      (window as PlaylistOverrideBridge).potok_playlist_override = playlist;
    }
    onPlay(episode, "default");
  }, [onPlay, playlist]);

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
    handlePlayAsPlaylist,
  };
}

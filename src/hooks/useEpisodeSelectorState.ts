import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaylistItem } from "../context/playbackTypes";
import type { EpisodeSourceSection, GenericEpisodeItem } from "../components/common/episodeSelector/types";
import { SENTINEL_KEY } from "../components/common/episodeSelector/utils";

interface PlaylistOverrideBridge {
  potok_playlist_override?: PlaylistItem[];
}

interface UseEpisodeSelectorStateParams {
  isOpen: boolean;
  episodes: GenericEpisodeItem[];
  onPlay: (episode: GenericEpisodeItem, audioId: string) => void;
  onStartEditing?: () => void;
  onApplyOverride?: (sourceSeason: number | null, targetSeason: number, offset: number) => void;
}

export function useEpisodeSelectorState({
  isOpen,
  episodes,
  onPlay,
  onStartEditing,
  onApplyOverride,
}: UseEpisodeSelectorStateParams) {
  const { t } = useTranslation("media");
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSource, setEditingSource] = useState<{
    sourceSeason: number | null;
    rawFirstEp: number;
  } | null>(null);

  const uniqueSeasons = useMemo(
    () => Array.from(new Set(episodes.map((e) => e.season))).sort((a, b) => a - b),
    [episodes],
  );

  const sourceSections = useMemo((): EpisodeSourceSection[] => {
    const groups = new Map<string, GenericEpisodeItem[]>();
    for (const e of episodes) {
      const key = e.rawSeason !== undefined ? String(e.rawSeason) : SENTINEL_KEY;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    const arr = Array.from(groups.entries()).map(([key, eps]) => {
      const raws = eps.map((e) => e.rawEpisode).filter((n): n is number => n !== undefined);
      return {
        key,
        rawSeason: eps[0].rawSeason,
        displayedSeason: eps[0].season,
        rawFirstEp: raws.length ? Math.min(...raws) : 1,
        episodes: eps,
      };
    });
    arr.sort(
      (a, b) =>
        a.displayedSeason - b.displayedSeason || (a.rawSeason ?? 0) - (b.rawSeason ?? 0),
    );
    return arr;
  }, [episodes]);

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
    }
  }, [isOpen]);

  const handleEditSection = useCallback(
    (section: { rawSeason: number | undefined; rawFirstEp: number }) => {
      setEditingSource({ sourceSeason: section.rawSeason ?? null, rawFirstEp: section.rawFirstEp });
      setIsEditing(true);
      onStartEditing?.();
    },
    [onStartEditing],
  );

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingSource(null);
  }, []);

  const handleApplyOverrideInternal = useCallback(
    (targetSeason: number, targetEp: number) => {
      if (onApplyOverride) {
        const rawFirstEp = editingSource?.rawFirstEp ?? 1;
        onApplyOverride(
          editingSource?.sourceSeason ?? null,
          targetSeason,
          targetEp - rawFirstEp,
        );
      }
      setSelectedSeason(targetSeason);
      setEditingSource(null);
      setIsEditing(false);
    },
    [editingSource, onApplyOverride],
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
          season: ep.season,
          episode: ep.episode,
          title: ep.title || t("episode.fallbackName", { number: ep.episode }),
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

  const completedCount = episodes.filter((e) => e.isWatched).length;
  const totalCount = episodes.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
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
  };
}
import { useState, useEffect, useCallback, useMemo } from "react";
import { ApiClient } from "../network/ApiClient";
import type { TvEpisode } from "../network/ApiTypes";
import { logger } from "../utils/logger";
import { resizeTmdbImage } from "../utils/mediaUtils";

const STILL_SIZE = "w500";

export interface EpisodeSelection {
  season: number;
  number: number;
}

interface UseEpisodePickerDataParams {
  isOpen: boolean;
  mediaId: number;
  numberOfSeasons: number;
  initialSelected: EpisodeSelection[];
}

export function useEpisodePickerData({
  isOpen,
  mediaId,
  numberOfSeasons,
  initialSelected,
}: UseEpisodePickerDataParams) {
  const [loading, setLoading] = useState(true);
  const [seasonsData, setSeasonsData] = useState<{ seasonNumber: number; episodes: TvEpisode[] }[]>([]);
  const [selected, setSelected] = useState<EpisodeSelection[]>(initialSelected);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    setSelected(initialSelected);
    setLoading(true);

    const loadAllSeasons = async () => {
      try {
        const promises = Array.from({ length: numberOfSeasons }, (_, i) => i + 1).map(async (sNum) => {
          try {
            const data = await ApiClient.fetchTvSeason(mediaId, sNum);
            const mapped: TvEpisode[] = (data.episodes || []).map((ep) => ({
              id: ep.id,
              episodeNumber: ep.episodeNumber,
              name: ep.name,
              overview: ep.overview,
              stillPath: resizeTmdbImage(ep.stillPath || ep.still_path, STILL_SIZE),
              airDate: ep.airDate,
              seasonNumber: sNum,
            }));
            return { seasonNumber: sNum, episodes: mapped };
          } catch {
            return { seasonNumber: sNum, episodes: [] };
          }
        });

        const results = await Promise.all(promises);
        setSeasonsData(results.sort((a, b) => a.seasonNumber - b.seasonNumber));
      } catch (err) {
        logger.error("Failed to load seasons for multipicker", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllSeasons();
  }, [isOpen, mediaId, numberOfSeasons, initialSelected]);

  const uniqueSeasons = useMemo(
    () => seasonsData.filter((s) => s.episodes.length > 0).map((s) => s.seasonNumber),
    [seasonsData],
  );

  useEffect(() => {
    if (uniqueSeasons.length > 0 && !uniqueSeasons.includes(selectedSeason)) {
      setSelectedSeason(uniqueSeasons[0]);
    }
  }, [uniqueSeasons, selectedSeason]);

  const currentSeasonEpisodes = useMemo(
    () => seasonsData.find((s) => s.seasonNumber === selectedSeason)?.episodes ?? [],
    [seasonsData, selectedSeason],
  );

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => `${item.season}_${item.number}`)),
    [selected],
  );

  const totalEpisodes = useMemo(
    () => seasonsData.reduce((sum, s) => sum + s.episodes.length, 0),
    [seasonsData],
  );

  const toggleEpisode = useCallback((season: number, number: number) => {
    setSelected((prev) => {
      const exists = prev.some((item) => item.season === season && item.number === number);
      return exists
        ? prev.filter((item) => !(item.season === season && item.number === number))
        : [...prev, { season, number }];
    });
  }, []);

  const isCurrentSeasonFull =
    currentSeasonEpisodes.length > 0 &&
    currentSeasonEpisodes.every((ep) => selectedKeys.has(`${selectedSeason}_${ep.episodeNumber}`));

  const toggleCurrentSeason = useCallback(() => {
    setSelected((prev) => {
      const filtered = prev.filter((item) => item.season !== selectedSeason);
      if (isCurrentSeasonFull) return filtered;
      return [...filtered, ...currentSeasonEpisodes.map((ep) => ({ season: selectedSeason, number: ep.episodeNumber }))];
    });
  }, [selectedSeason, currentSeasonEpisodes, isCurrentSeasonFull]);

  const selectAll = useCallback(() => {
    setSelected(seasonsData.flatMap((s) => s.episodes.map((ep) => ({ season: s.seasonNumber, number: ep.episodeNumber }))));
  }, [seasonsData]);

  const deselectAll = useCallback(() => setSelected([]), []);

  const formatSelectedRanges = useCallback((list: EpisodeSelection[]): string => {
    if (list.length === 0) return "";
    const grouped: Record<number, number[]> = {};
    for (const item of list) {
      (grouped[item.season] ??= []).push(item.number);
    }
    const parts: string[] = [];
    for (const s of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
      const nums = grouped[s].sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = nums[0];
      let prev = nums[0];
      for (let i = 1; i <= nums.length; i++) {
        const cur = nums[i];
        if (cur === prev + 1) {
          prev = cur;
        } else {
          ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
          start = cur;
          prev = cur;
        }
      }
      parts.push(`S${s}: ${ranges.join(", ")}`);
    }
    return parts.join("; ");
  }, []);

  return {
    loading,
    seasonsData,
    selected,
    setSelected,
    selectedSeason,
    setSelectedSeason,
    uniqueSeasons,
    currentSeasonEpisodes,
    selectedKeys,
    totalEpisodes,
    toggleEpisode,
    toggleCurrentSeason,
    isCurrentSeasonFull,
    selectAll,
    deselectAll,
    formatSelectedRanges,
  };
}
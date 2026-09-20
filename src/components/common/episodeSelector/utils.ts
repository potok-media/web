import type { EpisodeSourceSection, GenericEpisodeItem } from "./types";

export const getStreamType = (ep: GenericEpisodeItem): string => {
  const url = ep.url || ep.audios?.[0]?.url || "";
  if (url.includes(".mpd")) return "DASH";
  if (url.includes(".m3u8")) return "HLS";
  const match = url.match(/\.[a-zA-Z0-9]{2,5}$/);
  return match ? match[0].replace(".", "").toUpperCase() : "MP4";
};

export const SENTINEL_KEY = "_";

export const resolvedSeasonNumbers = (episodes: GenericEpisodeItem[]): number[] =>
  Array.from(new Set(
    episodes
      .map((episode) => episode.season)
      .filter((season): season is number => typeof season === "number" && Number.isFinite(season)),
  )).sort((left, right) => left - right);

const sourceSectionKey = (episode: GenericEpisodeItem): string => {
  if (episode.groupId) return `arm:${episode.groupId}`;
  if (episode.rawSeason !== undefined) return String(episode.rawSeason);
  if (episode.season !== undefined) return `display:${episode.season}`;
  return SENTINEL_KEY;
};

export const buildEpisodeSourceSections = (episodes: GenericEpisodeItem[]): EpisodeSourceSection[] => {
  const groups = new Map<string, GenericEpisodeItem[]>();
  for (const episode of episodes) {
    const key = sourceSectionKey(episode);
    const existing = groups.get(key);
    if (existing) existing.push(episode);
    else groups.set(key, [episode]);
  }

  return Array.from(groups.entries())
    .map(([key, items]): EpisodeSourceSection => {
      const rawEpisodes = items
        .map((episode) => episode.rawEpisode)
        .filter((number): number is number => number !== undefined);
      const displayedSeason = items.find((episode) => episode.season !== undefined)?.season;
      return {
        key,
        rawSeason: items[0].rawSeason,
        displayedSeason,
        unresolved: !items.some((episode) => episode.groupId || episode.season !== undefined),
        rawFirstEp: rawEpisodes.length ? Math.min(...rawEpisodes) : 1,
        episodes: items,
      };
    })
    .sort((left, right) => {
      if (left.unresolved !== right.unresolved) return left.unresolved ? 1 : -1;
      return (left.displayedSeason ?? 0) - (right.displayedSeason ?? 0) ||
        (left.rawSeason ?? 0) - (right.rawSeason ?? 0);
    });
};

export const hasEpisodeParsingWarning = ({
  episodes,
  mediaType,
  parserVerdict,
}: {
  episodes: GenericEpisodeItem[];
  mediaType: string;
  parserVerdict?: boolean;
}): boolean => {
  if (parserVerdict) return true;
  const seasons = resolvedSeasonNumbers(episodes);
  return mediaType === "tv" && seasons.length > 0 && seasons.every((season) => season === 0);
};

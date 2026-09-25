import type { EpisodeSourceSection, GenericEpisodeItem } from "./types";

export const getStreamType = (ep: GenericEpisodeItem): string => {
  const url = ep.url || ep.audios?.[0]?.url || "";
  if (url.includes(".mpd")) return "DASH";
  if (url.includes(".m3u8")) return "HLS";
  const match = url.match(/\.[a-zA-Z0-9]{2,5}$/);
  return match ? match[0].replace(".", "").toUpperCase() : "MP4";
};

export const SENTINEL_KEY = "_";

export const isArmEpisode = (episode: GenericEpisodeItem): boolean =>
  episode.resolutionState !== undefined || Boolean(episode.groupId || episode.orderingId || episode.episodeId);

export const resolvedSeasonNumbers = (episodes: GenericEpisodeItem[]): number[] =>
  Array.from(new Set(
    episodes
      .map((episode) => episode.season)
      .filter((season): season is number => typeof season === "number" && Number.isFinite(season)),
  )).sort((left, right) => left - right);

const sourceSectionKey = (episode: GenericEpisodeItem): string => {
  if (episode.groupId) return `arm:${episode.groupId}`;
  if (isArmEpisode(episode)) return SENTINEL_KEY;
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
      const canonical = isArmEpisode(items[0]);
      const displayedSeason = canonical
        ? items.find((episode) => episode.groupDisplayNumber !== undefined)?.groupDisplayNumber
        : items.find((episode) => episode.season !== undefined)?.season;
      return {
        key,
        rawSeason: items[0].rawSeason,
        displayedSeason,
        unresolved: canonical ? !items.some((episode) => episode.groupId) : displayedSeason === undefined,
        rawFirstEp: rawEpisodes.length ? Math.min(...rawEpisodes) : 1,
        groupTitle: items.find((episode) => episode.groupTitle)?.groupTitle,
        groupKind: items.find((episode) => episode.groupKind)?.groupKind,
        episodes: items,
      };
    })
    .sort((left, right) => {
      if (left.unresolved !== right.unresolved) return left.unresolved ? 1 : -1;
      // Canonical rows arrive in ARM ordering; provider season numbers and group kinds must not reorder it.
      const leftCanonical = isArmEpisode(left.episodes[0]);
      const rightCanonical = isArmEpisode(right.episodes[0]);
      if (leftCanonical || rightCanonical) return Number(rightCanonical) - Number(leftCanonical);
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
  if (parserVerdict !== undefined) return parserVerdict;
  if (episodes.length > 0 && episodes.every((episode) => episode.episodeId && episode.groupId)) return false;
  const seasons = resolvedSeasonNumbers(episodes);
  return mediaType === "tv" && seasons.length > 0 && seasons.every((season) => season === 0);
};

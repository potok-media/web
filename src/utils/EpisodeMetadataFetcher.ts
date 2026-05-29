import { ApiClient } from "../network/ApiClient";
import type { TorrentFileItem, MediaCard } from "../network/ApiClient";

export async function fetchTvEpisodeMetadata(
  mediaItem: MediaCard,
  files: TorrentFileItem[]
): Promise<Record<string, any>> {
  if (mediaItem.mediaType !== "tv" || files.length === 0) {
    return {};
  }

  const seasonsInFiles = Array.from(
    new Set(
      files
        .map((f) => f.season)
        .filter((s): s is number => s !== undefined && s !== null && s > 0)
    )
  );

  if (seasonsInFiles.length === 0) {
    return {};
  }

  const seasonPromises = seasonsInFiles.map((s) =>
    ApiClient.fetchTvSeason(mediaItem.id, s)
  );
  
  const seasonResults = await Promise.all(seasonPromises);
  const metadataMap: Record<string, any> = {};

  seasonResults.forEach((season) => {
    const episodes = season.episodes || [];
    episodes.forEach((ep: any) => {
      const epNum = ep.episodeNumber ?? ep.episode_number;
      const sNum =
        ep.seasonNumber ??
        ep.season_number ??
        season.seasonNumber;
      metadataMap[`${sNum}:${epNum}`] = ep;
    });
  });

  return metadataMap;
}

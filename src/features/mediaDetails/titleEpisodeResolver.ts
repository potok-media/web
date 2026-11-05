import { ApiClient } from "../../network/ApiClient";
import { canReadArmLayout } from "../../network/ArmTypes";
import type { MediaCard, TvEpisode } from "../../network/ApiTypes";
import {
  collapseKindGroupPresentations,
  toEpisodeGroupPresentations,
} from "../arm/episodeLayoutModel";
import { reconstructLayout } from "../arm/layoutReconstruction";
import {
  getArmEntriesCached,
  getArmEpisodesCached,
  getArmResolveCached,
} from "../arm/armLayoutCache";

/**
 * Every episode of a TV title across all groups/seasons — the «mark whole title watched» toggle
 * needs the full list to write per-episode history rows (a title-level row would leave the
 * episode ticks stale forever). ARM first; legacy TMDB seasons are the fallback for titles the
 * graph does not cover. All ARM reads go through the shared layout caches, so by the time the
 * user can click the button the section has usually already warmed them and this resolves
 * without extra network. Never throws — an empty result means "fall back to the title-level
 * mutation".
 */
export async function resolveTitleEpisodes(
  media: MediaCard,
  locale: string,
): Promise<TvEpisode[]> {
  const armEpisodes = await resolveArmTitleEpisodes(media, locale);
  if (armEpisodes.length > 0) return armEpisodes;
  return resolveLegacyTitleEpisodes(media);
}

async function resolveArmTitleEpisodes(
  media: MediaCard,
  locale: string,
): Promise<TvEpisode[]> {
  try {
    let workId = canReadArmLayout(media.arm) ? media.arm?.workId ?? null : null;
    if (!workId) {
      const reference = { provider: "tmdb" as const, entityKind: "tv" as const, value: String(media.id) };
      const resolved = await getArmResolveCached(reference, locale, (ifNoneMatch) =>
        ApiClient.resolveArmWork(reference, { locale, ifNoneMatch }));
      workId = resolved.workId ?? null;
    }
    if (!workId) return [];

    const [entriesRes, episodesRes] = await Promise.all([
      getArmEntriesCached(workId, undefined, locale, (ifNoneMatch) =>
        ApiClient.getArmEntries(workId, { locale, ifNoneMatch })),
      getArmEpisodesCached(workId, undefined, locale, (ifNoneMatch) =>
        ApiClient.getArmEpisodes(workId, { locale, ifNoneMatch })),
    ]);
    const layout = reconstructLayout(entriesRes.entries, episodesRes.episodes, workId, locale);
    return collapseKindGroupPresentations(toEpisodeGroupPresentations(layout)).flatMap(
      (group) => group.episodes,
    );
  } catch {
    return [];
  }
}

async function resolveLegacyTitleEpisodes(media: MediaCard): Promise<TvEpisode[]> {
  const seasons = media.numberOfSeasons ?? 0;
  if (!Number.isFinite(media.id) || media.id <= 0 || seasons <= 0) return [];

  const results = await Promise.all(
    Array.from({ length: seasons }, (_, i) => i + 1).map(async (seasonNumber) => {
      try {
        const data = await ApiClient.fetchTvSeason(media.id, seasonNumber);
        return (data.episodes || []).map((episode) => ({ ...episode, seasonNumber }));
      } catch {
        return [] as TvEpisode[];
      }
    }),
  );
  return results.flat();
}

import type {
  ArmEpisodeDetail,
  ArmEpisodeLayoutResponse,
  ArmEntryDetail,
  ArmLayoutEpisode,
  ArmLayoutGroup,
} from "../../network/ArmTypes";

function normalizeLocale(locale: string): string {
  return locale.trim().replaceAll("_", "-").toLowerCase();
}

function selectLocalizedEntryTitle(
  titles: ArmEntryDetail["localizedTitles"],
  locale: string,
): string | null {
  const requestedLocale = normalizeLocale(locale);
  if (!requestedLocale) return titles[0]?.value ?? null;

  const requestedLanguage = requestedLocale.split("-")[0];
  const exactMatch = titles.find(
    (title) => normalizeLocale(title.language) === requestedLocale,
  );
  const baseLanguageMatch = titles.find(
    (title) => normalizeLocale(title.language) === requestedLanguage,
  );
  const compatibleLanguageMatch = titles.find(
    (title) => normalizeLocale(title.language).split("-")[0] === requestedLanguage,
  );

  return (exactMatch ?? baseLanguageMatch ?? compatibleLanguageMatch ?? titles[0])?.value ?? null;
}

/**
 * Reconstructs the legacy `ArmEpisodeLayoutResponse` shape from the new
 * flat `entries` + `episodes` responses.
 *
 * The new endpoints return entries (seasons, sides, movies) and episodes
 * as separate paginated lists. This function merges episodes into their
 * parent groups so that existing consumers (`toEpisodeGroupPresentations`,
 * `armGroupDisplay`, `armGroupSelection`) work without changes.
 */
export function reconstructLayout(
  entries: ArmEntryDetail[],
  episodes: ArmEpisodeDetail[],
  workId: string,
  locale: string,
): ArmEpisodeLayoutResponse {
  // Build episode map: groupId -> episode list sorted by position
  const episodeMap = new Map<string, ArmLayoutEpisode[]>();
  for (const ep of episodes) {
    const groupEpisodes = episodeMap.get(ep.groupId) ?? [];
    groupEpisodes.push(toLayoutEpisode(ep));
    episodeMap.set(ep.groupId, groupEpisodes);
  }

  // Build groups from entries, attaching sorted episodes
  const groups: ArmLayoutGroup[] = entries
    .map((entry) => {
      const epList = episodeMap.get(entry.entryId) ?? [];
      return {
        id: entry.entryId,
        kind: entry.kind,
        number: entry.number,
        aniListId: null,
        malId: null,
        tmdbShow: entry.tmdb?.showId ?? null,
        tmdbSeason: entry.tmdb?.season ?? null,
        title: selectLocalizedEntryTitle(entry.localizedTitles, locale),
        episodes: epList,
      };
    })
    .sort((a, b) => {
      // Backend's kind-aware sort: season < sides < movie < ova < specials
      const kindOrder = {
        season: 0,
        sides: 1,
        movie: 2,
        ova: 3,
        specials: 4,
      };
      const aRank = kindOrder[a.kind as keyof typeof kindOrder] ?? 5;
      const bRank = kindOrder[b.kind as keyof typeof kindOrder] ?? 5;
      if (aRank !== bRank) return aRank - bRank;
      return a.number - b.number;
    });

  return {
    work: { id: workId },
    graphVersion: null,
    groups,
  };
}

function toLayoutEpisode(ep: ArmEpisodeDetail): ArmLayoutEpisode {
  return {
    id: ep.episodeId,
    number: ep.number,
    filler: ep.filler,
    tmdb: ep.tmdb
      ? {
          show: ep.tmdb.showId,
          season: ep.tmdb.season,
          episode: ep.tmdb.episode,
        }
      : null,
    localizedTitles: ep.localizedTitles,
  };
}

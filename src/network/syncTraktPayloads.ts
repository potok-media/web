interface TraktSyncPayload {
  movies: { ids: { tmdb: number } }[];
  shows: {
    ids: { tmdb: number };
    seasons?: { number: number; episodes: { number: number }[] }[];
  }[];
  episodes: { ids: { tmdb: number } }[];
}

export function traktMediaPayload(
  tmdbId: string,
  mediaType: string,
  seasonNumber?: number,
  episodeNumber?: number,
): TraktSyncPayload {
  const id = Number(tmdbId);
  const movies = mediaType === "movie" ? [{ ids: { tmdb: id } }] : [];
  const episodes = mediaType === "episode" ? [{ ids: { tmdb: id } }] : [];

  let shows: TraktSyncPayload["shows"] = [];
  if (mediaType === "tv") {
    if (seasonNumber !== undefined && episodeNumber !== undefined) {
      shows = [{
        ids: { tmdb: id },
        seasons: [{ number: seasonNumber, episodes: [{ number: episodeNumber }] }],
      }];
    } else {
      shows = [{ ids: { tmdb: id } }];
    }
  }

  return { movies, shows, episodes };
}

export function traktBulkHistoryPayload(
  tmdbId: string,
  changes: { seasonNumber: number; episodeNumber: number }[],
): TraktSyncPayload {
  const seasonMap: Record<number, number[]> = {};
  for (const item of changes) {
    if (!seasonMap[item.seasonNumber]) seasonMap[item.seasonNumber] = [];
    seasonMap[item.seasonNumber].push(item.episodeNumber);
  }
  const seasons = Object.keys(seasonMap).map(Number).map((sNum) => ({
    number: sNum,
    episodes: seasonMap[sNum].map((eNum) => ({ number: eNum })),
  }));

  return {
    movies: [],
    shows: [{ ids: { tmdb: Number(tmdbId) }, seasons }],
    episodes: [],
  };
}
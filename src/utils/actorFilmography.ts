import type { MediaCard, TmdbCreditItem } from "../network/ApiTypes";

export interface ActorGenreConfig {
  id: string;
  ids: number[];
  titleKey: string;
}

export interface ActorFilmographySection {
  id: string;
  titleKey: string;
  items: MediaCard[];
  allItems: MediaCard[];
}

const creditKey = (item: TmdbCreditItem): string =>
  `${item.media_type ?? "movie"}-${item.id}`;

export function deduplicateCredits(items: TmdbCreditItem[]): TmdbCreditItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = creditKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getYearFromDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? "" : date.getFullYear().toString();
}

export function mapCreditToMediaCard(
  item: TmdbCreditItem,
  gatewayBaseUrl: string,
): MediaCard {
  return {
    id: item.id,
    title: item.title ?? item.name ?? "",
    originalTitle: item.original_title ?? item.original_name ?? "",
    posterSrc: item.poster_path
      ? `${gatewayBaseUrl}/media/tmdb/t/p/w342${item.poster_path}`
      : "",
    mediaType: item.media_type ?? "movie",
    tmdbRating: item.vote_average,
    subtitle: getYearFromDate(item.release_date ?? item.first_air_date),
  };
}

export function mapCreditsToMediaCards(
  items: TmdbCreditItem[],
  gatewayBaseUrl: string,
): MediaCard[] {
  return items.map((item) => mapCreditToMediaCard(item, gatewayBaseUrl));
}

export function buildCastSection(
  cast: TmdbCreditItem[] | undefined,
  gatewayBaseUrl: string,
  limit = 20,
): { preview: MediaCard[]; all: TmdbCreditItem[] } {
  if (!cast?.length) return { preview: [], all: [] };
  const sorted = cast
    .filter((m) => m.poster_path)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const all = deduplicateCredits(sorted);
  return {
    preview: mapCreditsToMediaCards(all.slice(0, limit), gatewayBaseUrl),
    all,
  };
}

export function buildCrewSection(
  crew: TmdbCreditItem[] | undefined,
  jobFilter: (job: string | undefined) => boolean,
  gatewayBaseUrl: string,
  limit = 20,
): { preview: MediaCard[]; all: TmdbCreditItem[] } {
  if (!crew?.length) return { preview: [], all: [] };
  const sorted = crew
    .filter((m) => jobFilter(m.job) && m.poster_path)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const all = deduplicateCredits(sorted);
  return {
    preview: mapCreditsToMediaCards(all.slice(0, limit), gatewayBaseUrl),
    all,
  };
}

export function buildGenreSections(
  cast: TmdbCreditItem[] | undefined,
  genres: ActorGenreConfig[],
  gatewayBaseUrl: string,
  limit = 20,
): ActorFilmographySection[] {
  if (!cast?.length) return [];

  return genres
    .map((genre) => {
      const matching = cast
        .filter(
          (m) =>
            m.poster_path &&
            m.genre_ids?.some((genreId) => genre.ids.includes(genreId)),
        )
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

      const deduped = deduplicateCredits(matching);
      if (deduped.length < 3) return null;

      const allItems = mapCreditsToMediaCards(deduped, gatewayBaseUrl);
      return {
        id: `genre-${genre.id}`,
        titleKey: genre.titleKey,
        items: allItems.slice(0, limit),
        allItems,
      };
    })
    .filter((section): section is ActorFilmographySection => section !== null);
}

export function resolveProfileImageUrl(
  path: string | null | undefined,
  gatewayBaseUrl: string,
): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${gatewayBaseUrl}/media/tmdb/t/p/h632${path}`;
}
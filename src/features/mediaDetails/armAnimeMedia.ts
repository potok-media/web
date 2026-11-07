import type { TFunction } from "i18next";
import type { MediaCard } from "../../network/ApiTypes";
import type {
  ArmEntryDetail,
  ArmEntryId,
  ArmEpisodeDetail,
  ArmWorkId,
} from "../../network/ArmTypes";

/**
 * Anime works render inside the regular MediaDetailsPage — the page consumes the TMDB-shaped
 * MediaCard everywhere, so the ARM-side identity (entries + AniList/Shikimori metadata) is
 * synthesized into one card here. TMDB-only consumers key off `media.id > 0` and stay gated.
 */
export interface ArmAnimeDetailsInput {
  workId: ArmWorkId;
  entries: ArmEntryDetail[];
  episodes: ArmEpisodeDetail[];
  /** Deep-link group (entry) the page opens on. */
  initialGroupId?: ArmEntryId | null;
  graphVersion?: string | null;
}

/** The group the page presents: the requested deep link, else the first anime-metadata group. */
export function selectArmAnimeEntry(
  entries: ArmEntryDetail[],
  initialGroupId?: ArmEntryId | null,
): ArmEntryDetail | null {
  if (initialGroupId) {
    const requested = entries.find((entry) => entry.entryId === initialGroupId);
    if (requested) return requested;
  }
  return entries.find((entry) => entry.displayMetadata) ?? entries[0] ?? null;
}

/** Strip HTML and Shikimori bbcode markup; <br>/<p> become line breaks for pre-line rendering. */
export function stripAnimeMarkup(value: string | null | undefined): string | null {
  if (!value) return null;
  const withBreaks = value
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
    .replace(/\n{3,}/g, "\n\n");
  const plain = withBreaks
    .replace(/<[^>]*>/g, "")
    .replace(/\[(?:url(?:=[^\]]*)?|\/url|b|\/b|i|\/i|u|\/u|spoiler(?:=[^\]]*)?|\/spoiler|quote(?:=[^\]]*)?|\/quote)\]/gi, "");
  const collapsed = plain
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .trim();
  return collapsed || null;
}

const localePrefix = (locale: string | undefined): string =>
  (locale || "").toLowerCase().split("-")[0];

/** Best display title: exact locale > language prefix > first stored title. */
export function selectAnimeTitle(entry: ArmEntryDetail, locale: string | undefined): string {
  const titles = entry.localizedTitles;
  if (titles.length === 0) return "—";
  const exact = titles.find((title) => title.language === locale);
  if (exact) return exact.value;
  const prefix = localePrefix(locale);
  const byLanguage = titles.find((title) => localePrefix(title.language) === prefix && prefix);
  return (byLanguage ?? titles[0]).value;
}

/** Locale-aware description: ru interface prefers Shikimori, everything else prefers AniList. */
export function selectAnimeDescription(
  entry: ArmEntryDetail,
  locale: string | undefined,
): string | null {
  const meta = entry.displayMetadata;
  if (!meta) return null;
  const shikimori = stripAnimeMarkup(meta.shikimoriDescription);
  const anilist = stripAnimeMarkup(meta.description);
  if (localePrefix(locale) === "ru") return shikimori ?? anilist;
  return anilist ?? shikimori;
}

export interface AnimeExternalLink {
  id: string;
  label: string;
  url: string;
}

/** Outbound links to the anime sources — only ids the graph actually carries. */
export function animeExternalLinks(entry: ArmEntryDetail): AnimeExternalLink[] {
  const links: AnimeExternalLink[] = [];
  const byProvider = (provider: string) =>
    entry.externalIds.find((id) => id.provider === provider)?.value;
  const mal = byProvider("mal");
  if (mal) {
    links.push({ id: "mal", label: "MAL", url: `https://myanimelist.net/anime/${mal}` });
    // Shikimori shares the MAL id space; a dedicated reference wins when present.
    const shikimori = byProvider("shikimori") ?? mal;
    links.push({ id: "shikimori", label: "Shikimori", url: `https://shikimori.io/animes/${shikimori}` });
  }
  const siteUrl = entry.displayMetadata?.siteUrl;
  const anilistRef = byProvider("anilist");
  const anilistUrl = siteUrl ?? (anilistRef ? `https://anilist.co/anime/${anilistRef}` : null);
  if (anilistUrl) links.push({ id: "anilist", label: "AniList", url: anilistUrl });
  return links;
}

const formatKey = (format: string): string => format.toLowerCase();
const statusKey = (status: string): string => status.toLowerCase();

/**
 * Synthesize the TMDB-shaped card from the ARM entry metadata. Returns null when the work has
 * no entries at all (the caller falls back to the error view).
 */
export function buildArmAnimeMedia(
  input: ArmAnimeDetailsInput,
  locale: string | undefined,
  t: TFunction,
): MediaCard | null {
  const entry = selectArmAnimeEntry(input.entries, input.initialGroupId);
  if (!entry) return null;
  const meta = entry.displayMetadata;

  const mediaType: "movie" | "tv" = entry.kind === "movie" ? "movie" : "tv";
  const year = meta?.seasonYear ?? (meta?.startDate ? Number(meta.startDate.slice(0, 4)) || undefined : undefined);
  const seasonCount = input.entries.filter((candidate) => candidate.kind === "season").length;

  const metaChips: string[] = [];
  if (meta?.format) metaChips.push(t(`anime.format.${formatKey(meta.format)}`, { defaultValue: meta.format }));
  if (meta?.status) metaChips.push(t(`anime.status.${statusKey(meta.status)}`, { defaultValue: meta.status }));
  const episodeCount = meta?.episodeCount ?? input.episodes.filter((episode) => episode.groupId === entry.entryId).length;
  if (mediaType === "tv" && episodeCount > 0) {
    metaChips.push(t("anime.episodesCount", { count: episodeCount }));
  }
  if (meta?.durationMinutes) metaChips.push(t("anime.minutes", { count: meta.durationMinutes }));

  return {
    id: 0,
    title: selectAnimeTitle(entry, locale),
    year,
    posterSrc: meta?.cover?.large ?? meta?.cover?.medium ?? undefined,
    backdropSrc: meta?.banner ?? undefined,
    mediaType,
    subtitle: metaChips.join(" · "),
    overview: selectAnimeDescription(entry, locale) ?? undefined,
    genres: meta?.genres?.length ? meta.genres.join(", ") : undefined,
    ageRating: meta?.isAdult ? "18+" : undefined,
    tmdbRating: meta?.score != null ? meta.score / 10 : undefined,
    numberOfSeasons: mediaType === "tv" && seasonCount > 0 ? seasonCount : undefined,
    arm: { workId: input.workId, graphVersion: input.graphVersion ?? null },
  };
}

/** Stable Potok-owned identities. Provider ids must never be used in their place. */
export type ArmWorkId = string;
export type ArmEntryId = string;
export type ArmEpisodeId = string;
export type ArmGraphVersion = string;

export type ArmFillerStatus = "canon" | "filler" | "mixed" | "recap";

/** Filler verdict attached to a layout episode; canon renders no badge. */
export interface ArmEpisodeFiller {
  status: ArmFillerStatus;
  confidence: number | null;
  disputed: boolean;
}

/** TMDB episode coordinate published by the graph's TMDB bridge. */
export interface ArmTmdbCoordinate {
  show: number;
  season: number;
  episode: number;
}

export interface ArmWorkSummary {
  id: ArmWorkId;
}

/** Provider identity probe used only as the resolve-work request input. */
export interface ArmProviderReference {
  provider: string;
  entityKind: string;
  value: string;
}

/**
 * One graph episode: identity, structure and localized titles. Display metadata
 * (overview, still, air date) is overlayed from TMDB by the `tmdb` coordinate when available;
 * localized titles are carried as-is from the graph for non-TMDB entries (movies, OVAs, etc.).
 */
export interface ArmLayoutEpisode {
  id: ArmEpisodeId;
  number: number;
  filler?: ArmEpisodeFiller | null;
  tmdb?: ArmTmdbCoordinate | null;
  localizedTitles?: ArmLocalizedTitle[];
}

/**
 * One graph entry (a season/sides/movie/ova/specials block). The entry id doubles as the
 * group id: `id` IS the `entryId` used in binding targets and playback wiring. The TMDB
 * season coordinate (when bridged) is where display metadata comes from.
 */
export interface ArmLayoutGroup {
  id: ArmEntryId;
  kind: "season" | "sides" | "movie" | "ova" | "specials" | string;
  number: number;
  aniListId?: number | null;
  malId?: number | null;
  tmdbShow?: number | null;
  tmdbSeason?: number | null;
  /** Entry title resolved from the structure source (AniList cache) at read time. */
  title?: string | null;
  episodes: ArmLayoutEpisode[];
}

/**
 * GET /api/arm/v1/works/{workId}/layout — the v2 graph structure. Groups arrive in the
 * backend's kind-aware sort order, episodes ordered by number inside each group; the
 * client never re-sorts beyond its stable kind-priority display order.
 */
export interface ArmEpisodeLayoutResponse {
  work: ArmWorkSummary;
  graphVersion: ArmGraphVersion | null;
  groups: ArmLayoutGroup[];
}

/** GET /api/arm/v1/works/resolve/{provider}/{entityKind}/{id} — null workId means unresolved. */
export interface ArmResolveResponse {
  workId: ArmWorkId | null;
  graphVersion?: ArmGraphVersion | null;
}

export interface ArmEpisodeSegment {
  kind: string;
  startMs: number;
  endMs: number;
}

/** GET /api/arm/v1/episodes/{episodeId}/segments — the cut nearest to the requested duration. */
export interface ArmEpisodeSegmentsResponse {
  segments: ArmEpisodeSegment[];
}

/** Additive identity summary attached to legacy TMDB-shaped media cards. */
export interface ArmMediaSummary {
  workId: ArmWorkId | null;
  graphVersion: ArmGraphVersion | null;
}

export function canReadArmLayout(summary: ArmMediaSummary | null | undefined): summary is ArmMediaSummary & {
  workId: ArmWorkId;
} {
  return Boolean(summary?.workId);
}

// ── New API responses (POST-migration) ──────────────────────────────────────────

/** GET /api/arm/v1/version — the graph build stamp. */
export interface ArmGraphVersionResponse {
  /** ISO-8601 built_at timestamp from graph_state. */
  builtAt: string;
}

/** GET /api/arm/v1/works/{id} — enriched work card from media table. */
export interface ArmWorkCardResponse {
  workId: ArmWorkId;
  type: "tv" | "movie" | string;
  year: number | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  originCountry: string | null;
  adult: boolean;
  seasonsCount: number;
  episodesCount: number;
  entryCount: number | null;
  episodeCount: number | null;
}

/** One localized title from a source (media table titles array). */
export interface ArmLocalizedTitle {
  locale: string;
  value: string;
}

/** GET /api/arm/v1/works/{id}/localized-titles — all stored titles. */
export interface ArmLocalizedTitlesResponse {
  titles: ArmLocalizedTitle[];
}

/** One external id (provider/entityKind/value). */
export interface ArmExternalId {
  provider: string;
  entityKind: string;
  value: string;
}

/** GET /api/arm/v1/works/{id}/external-ids/simple — all work-level provider keys. */
export interface ArmExternalIdsResponse {
  externalIds: ArmExternalId[];
}

/** One AniList cover image variant. */
export interface ArmCoverImage {
  large: string | null;
  medium: string | null;
}

/** One AniList studio. */
export interface ArmStudio {
  name: string | null;
  url: string | null;
}

/** Full AniList display metadata for an entry. */
export interface ArmEntryDisplayMetadata {
  cover: ArmCoverImage | null;
  genres: string[];
  tags: string[];
  score: number | null;
  studios: ArmStudio[];
  description: string | null;
  synonyms: string[];
  format: string | null;
  status: string | null;
  episodeCount: number | null;
  durationMinutes: number | null;
  season: string | null;
  seasonYear: number | null;
  startDate: string | null;
  endDate: string | null;
  source: string | null;
  isAdult: boolean | null;
  popularity: number | null;
  siteUrl: string | null;
}

/** Entry-level TMDB bridge coordinate. */
export interface ArmEntryTmdbCoordinate {
  showId: number;
  season: number;
}

/** One localized release title from release_titles table. */
export interface ArmLocalizedReleaseTitle {
  language: string;
  value: string;
  source: string;
}

/** One entry (season/side/movie/OVA/specials) with full display metadata. */
export interface ArmEntryDetail {
  entryId: ArmEntryId;
  kind: string;
  number: number;
  sortPosition: number;
  structureSource: string;
  externalIds: ArmExternalId[];
  localizedTitles: ArmLocalizedReleaseTitle[];
  tmdb: ArmEntryTmdbCoordinate | null;
  displayMetadata: ArmEntryDisplayMetadata | null;
}

/** GET /api/arm/v1/works/{id}/entries — full entry list (no pagination). */
export interface ArmEntriesResponse {
  entries: ArmEntryDetail[];
}

/** Episode-level TMDB coordinate (show/season/episode). */
export interface ArmEpisodeTmdbCoordinate {
  showId: number;
  season: number;
  episode: number;
}

/** One episode with full display metadata. */
export interface ArmEpisodeDetail {
  episodeId: ArmEpisodeId;
  groupId: ArmEntryId;
  number: number;
  tmdb: ArmEpisodeTmdbCoordinate | null;
  localizedTitles: ArmLocalizedTitle[];
  overview: string | null;
  stillPath: string | null;
  airDate: string | null;
  filler: ArmEpisodeFiller | null;
}

/** GET /api/arm/v1/works/{id}/episodes — full episode list (no pagination). */
export interface ArmEpisodesResponse {
  episodes: ArmEpisodeDetail[];
}

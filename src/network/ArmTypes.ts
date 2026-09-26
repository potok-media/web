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

/** All published title variants of a work (locale-selected `title` is separate). */
export interface ArmTitles {
  official?: string | null;
  en?: string | null;
  ru?: string | null;
  original?: string | null;
}

export interface ArmWorkSummary {
  id: ArmWorkId;
  title: string | null;
  titles: ArmTitles;
}

/** Provider identity probe used only as the resolve-work request input. */
export interface ArmProviderReference {
  provider: string;
  entityKind: string;
  value: string;
}

export interface ArmLayoutEpisode {
  id: ArmEpisodeId;
  number: number;
  title?: string | null;
  overview?: string | null;
  stillPath?: string | null;
  airDate?: string | null;
  filler?: ArmEpisodeFiller | null;
  tmdb?: ArmTmdbCoordinate | null;
}

/**
 * One graph entry (a season/sides/movie/ova/specials block). The entry id doubles as the
 * group id: `id` IS the `entryId` used in binding targets and playback wiring.
 */
export interface ArmLayoutGroup {
  id: ArmEntryId;
  kind: "season" | "sides" | "movie" | "ova" | "specials" | string;
  number: number;
  title?: string | null;
  anilistId?: number | null;
  malId?: number | null;
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

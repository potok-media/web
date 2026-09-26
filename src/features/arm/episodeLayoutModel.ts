import type { TvEpisode } from "../../network/ApiTypes";
import type {
  ArmEpisodeLayoutResponse,
  ArmLayoutEpisode,
  ArmLayoutGroup,
} from "../../network/ArmTypes";
import { resizeTmdbImage } from "../../utils/mediaUtils";

// Matches the legacy season pipeline (useSeasonEpisodes.ts): episode stills decode at w500.
const STILL_SIZE = "w500";

export interface EpisodeGroupTitleFallback {
  /** Canonical backend taxonomy: season | sides | movie | ova | specials. */
  kind: string;
  number: number | null;
}

export interface EpisodeGroupPresentation {
  id: string;
  kind: string;
  title: string;
  /** Set when the title must be finalized by the component (localized per group kind). */
  titleFallback?: EpisodeGroupTitleFallback;
  displayNumber?: number | null;
  episodes: TvEpisode[];
}

export interface EpisodeLayoutPresentationOptions {
  /** Gateway base URL used to proxy raw TMDB-relative still paths. */
  imageBaseUrl?: string;
}

function finiteNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function textValue(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function stillUrl(
  stillPath: string | null | undefined,
  imageBaseUrl: string | undefined,
): string | undefined {
  if (!stillPath) return undefined;
  if (/^https?:\/\//i.test(stillPath)) return resizeTmdbImage(stillPath, STILL_SIZE);
  if (!imageBaseUrl) return stillPath;
  const base = imageBaseUrl.replace(/\/$/, "");
  const path = stillPath.startsWith("/") ? stillPath : `/${stillPath}`;
  return `${base}/media/tmdb/t/p/${STILL_SIZE}${path}`;
}

function groupTitle(group: ArmLayoutGroup): { title: string; titleFallback?: EpisodeGroupTitleFallback } {
  const explicit = textValue(group.title);
  if (explicit) return { title: explicit };
  // Any untitled group defers to the component for a localized label keyed by its actual kind.
  return {
    title: "",
    titleFallback: { kind: group.kind, number: finiteNumber(group.number) ?? null },
  };
}

/**
 * Kinds the picker renders as one combined entry: enumerated "Movie"/"Specials"/"Sides" tabs carry
 * no information, so every group of these kinds merges into a single synthetic presentation.
 */
const COLLAPSED_GROUP_KINDS = new Set(["sides", "specials", "movie", "ova"]);

/**
 * Collapses all sides/specials/movie/ova groups into one presentation per kind.
 * Input groups arrive in the backend's kind-aware order (with episodes ordered by number inside
 * each group), so the merged episode list keeps group-then-episode order. Episode objects are
 * carried over untouched — `armEpisodeId`/`armEntryId` still point at the source entry, so
 * watched state, history and streams wiring keep working. The empty title plus a number-less
 * kind fallback makes the component render the generic localized kind label ("Спешлы" / "Фильмы").
 */
/**
 * A collapsed Films/Specials card is an independent item: with neither a title nor a still
 * it renders as a bare "1" and carries no information, so it is dropped (owner's rule).
 * The number-echo fallback name ("1" from episode number 1) does not count as a title.
 */
function isDisplayableEpisode(episode: TvEpisode): boolean {
  if (episode.stillPath) return true;
  if (!episode.name) return false;
  return episode.name !== String(episode.armNumber ?? "") && episode.name !== String(episode.episodeNumber);
}

export function collapseKindGroupPresentations(
  groups: EpisodeGroupPresentation[],
): EpisodeGroupPresentation[] {
  const collapsedByKind = new Map<string, EpisodeGroupPresentation>();
  const result: EpisodeGroupPresentation[] = [];
  for (const group of groups) {
    if (!COLLAPSED_GROUP_KINDS.has(group.kind)) {
      result.push(group);
      continue;
    }
    let collapsed = collapsedByKind.get(group.kind);
    const displayable = group.episodes.filter(isDisplayableEpisode);
    if (!collapsed && displayable.length === 0)
      continue;
    if (!collapsed) {
      collapsed = {
        id: `collapsed-${group.kind}`,
        kind: group.kind,
        title: "",
        titleFallback: { kind: group.kind, number: null },
        displayNumber: null,
        episodes: [],
      };
      collapsedByKind.set(group.kind, collapsed);
      result.push(collapsed);
    }
    collapsed.episodes.push(...displayable);
  }
  return result;
}

function toTvEpisode(
  episode: ArmLayoutEpisode,
  group: ArmLayoutGroup,
  options?: EpisodeLayoutPresentationOptions,
): TvEpisode {
  return {
    id: episode.id,
    name: textValue(episode.title) ?? "",
    overview: episode.overview ?? undefined,
    episodeNumber: finiteNumber(episode.number) ?? 0,
    seasonNumber: finiteNumber(group.number) ?? 0,
    airDate: episode.airDate ?? undefined,
    stillPath: stillUrl(episode.stillPath, options?.imageBaseUrl),
    armEpisodeId: episode.id,
    armEntryId: group.id,
    armNumber: finiteNumber(episode.number),
    filler: episode.filler ?? null,
    tmdbSeasonNumber: episode.tmdb?.season,
    tmdbEpisodeNumber: episode.tmdb?.episode,
  };
}

export function toEpisodeGroupPresentations(
  layout: ArmEpisodeLayoutResponse,
  options?: EpisodeLayoutPresentationOptions,
): EpisodeGroupPresentation[] {
  return collapseKindGroupPresentations(layout.groups.map((group) => ({
    id: group.id,
    kind: group.kind,
    ...groupTitle(group),
    displayNumber: finiteNumber(group.number) ?? null,
    episodes: group.episodes.map((episode) => toTvEpisode(episode, group, options)),
  })));
}

import type { TvEpisode } from "../../network/ApiTypes";
import type {
  ArmEpisodeLayoutResponse,
  ArmLayoutEpisode,
  ArmLayoutGroup,
} from "../../network/ArmTypes";
import { fetchTmdbSeasonMeta } from "./tmdbSeasonMeta";

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
  /** The TMDB season coordinate the group's display metadata overlays from (when bridged). */
  tmdbShow?: number | null;
  tmdbSeason?: number | null;
  episodes: TvEpisode[];
}

function finiteNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Structure-only mapping (ARM carries no display metadata since the identity-only narrowing):
 * every episode starts nameless and still-less; overlayTmdbEpisodeMeta fills display fields
 * from TMDB by the bridge coordinates. Collapsing runs AFTER the overlay so the
 * displayability filter sees real metadata.
 */
function toTvEpisode(
  episode: ArmLayoutEpisode,
  group: ArmLayoutGroup,
): TvEpisode {
  return {
    id: episode.id,
    name: "",
    episodeNumber: finiteNumber(episode.number) ?? 0,
    seasonNumber: finiteNumber(group.number) ?? 0,
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
): EpisodeGroupPresentation[] {
  return layout.groups.map((group) => ({
    id: group.id,
    kind: group.kind,
    title: "",
    titleFallback: { kind: group.kind, number: finiteNumber(group.number) ?? null },
    displayNumber: finiteNumber(group.number) ?? null,
    tmdbShow: group.tmdbShow ?? null,
    tmdbSeason: group.tmdbSeason ?? null,
    episodes: group.episodes.map((episode) => toTvEpisode(episode, group)),
  }));
}

/**
 * Fills group titles (localized TMDB season names) and episode display fields (name,
 * overview, still, air date) from TMDB by each group's bridge coordinate. Unbridged groups
 * and failed fetches stay bare — cosmetic degradation, never a broken layout.
 */
export async function overlayTmdbEpisodeMeta(
  groups: EpisodeGroupPresentation[],
): Promise<EpisodeGroupPresentation[]> {
  return Promise.all(groups.map(async (group) => {
    if (group.tmdbShow == null || group.tmdbSeason == null) return group;
    const meta = await fetchTmdbSeasonMeta(group.tmdbShow, group.tmdbSeason);
    if (!meta) return group;
    return {
      ...group,
      title: meta.seasonName,
      episodes: group.episodes.map((episode) => {
        const overlay = episode.tmdbEpisodeNumber != null
          ? meta.episodes.get(episode.tmdbEpisodeNumber)
          : undefined;
        if (!overlay) return episode;
        return {
          ...episode,
          name: overlay.name,
          overview: overlay.overview,
          stillPath: overlay.stillPath,
          airDate: overlay.airDate,
        };
      }),
    };
  }));
}

/**
 * Kinds the picker renders as one combined entry: enumerated "Movie"/"Specials"/"Sides" tabs carry
 * no information, so every group of these kinds merges into a single synthetic presentation.
 */
const COLLAPSED_GROUP_KINDS = new Set(["sides", "specials", "movie", "ova"]);

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

/**
 * Collapses all sides/specials/movie/ova groups into one presentation per kind.
 * Input groups arrive in the backend's kind-aware order (with episodes ordered by number inside
 * each group), so the merged episode list keeps group-then-episode order. Episode objects are
 * carried over untouched — `armEpisodeId`/`armEntryId` still point at the source entry, so
 * watched state, history and streams wiring keep working. The empty title plus a number-less
 * kind fallback makes the component render the generic localized kind label ("Спешлы" / "Фильмы").
 */
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

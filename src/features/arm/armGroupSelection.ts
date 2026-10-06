import { kindRank } from "../../components/seasonGroupLabels";
import type { ArmEpisodeLayoutResponse, ArmLayoutGroup } from "../../network/ArmTypes";

/**
 * Group picking for the canonical /media/p/:potokId route. The ARM layout is the structure
 * authority: the page identity (TMDB coordinate) comes FROM the selected group, never from a
 * route-embedded provider id. Selection rules live here, pure and tested — components only
 * render the winner.
 */

interface RankableGroup {
  id: string;
  kind: string;
  number?: number | null;
  tmdbShow?: number | null;
  tmdbSeason?: number | null;
}

function groupNumber(group: RankableGroup): number {
  return typeof group.number === "number" && Number.isFinite(group.number) ? group.number : 0;
}

/** A group is page-addressable only with a TMDB bridge and at least one episode. */
function isBridged(group: ArmLayoutGroup): boolean {
  return group.tmdbShow != null && group.episodes.length > 0;
}

/** The main content group: seasons first (kind order), then the lowest number inside a kind. */
export function pickMainGroup<T extends RankableGroup>(groups: T[]): T | undefined {
  return [...groups].sort((a, b) => {
    const byKind = kindRank(a.kind) - kindRank(b.kind);
    return byKind !== 0 ? byKind : groupNumber(a) - groupNumber(b);
  })[0];
}

export interface ArmCanonicalTarget {
  entryId: string;
  mediaType: "tv" | "movie";
  tmdbId: number;
}

/**
 * The identity the canonical page opens on: the deep-linked entry (?g=) when it is bridged,
 * else the main bridged group. A group with a season coordinate is a tv show page, without
 * one a movie page. Null when no group is bridged — the work has no TMDB addressable content.
 */
export function resolveCanonicalTarget(
  layout: ArmEpisodeLayoutResponse,
  entryId?: string | null,
): ArmCanonicalTarget | null {
  const bridged = layout.groups.filter(isBridged);
  if (bridged.length === 0) return null;
  const group = (entryId ? bridged.find((candidate) => candidate.id === entryId) : undefined)
    ?? pickMainGroup(bridged);
  if (!group || group.tmdbShow == null) return null;
  return {
    entryId: group.id,
    mediaType: group.tmdbSeason != null ? "tv" : "movie",
    tmdbId: group.tmdbShow,
  };
}

/**
 * Where a legacy /media/{type}/{tmdbId} URL should land: the entry whose bridge coordinate IS
 * the requested show (Burn the Witch opened by its own id must not default into the Bleach
 * 2004 season of the same franchise work), else the main bridged group. Null when the layout
 * has nothing bridged — the caller keeps the legacy TMDB page as the fallback.
 */
export function resolveLegacyRedirect(
  layout: ArmEpisodeLayoutResponse,
  tmdbId: number,
): ArmCanonicalTarget | null {
  const bridged = layout.groups.filter(isBridged);
  if (bridged.length === 0) return null;
  const exact = bridged.filter((group) => group.tmdbShow === tmdbId);
  const group = exact.length > 0 ? pickMainGroup(exact) : pickMainGroup(bridged);
  if (!group || group.tmdbShow == null) return null;
  return {
    entryId: group.id,
    mediaType: group.tmdbSeason != null ? "tv" : "movie",
    tmdbId: group.tmdbShow,
  };
}

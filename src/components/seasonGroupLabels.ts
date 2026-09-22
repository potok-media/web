import type { TFunction } from "i18next";
import type { EpisodeGroupPresentation } from "../features/arm/episodeLayoutModel";

// Canonical ARM group taxonomy (backend docs/arm-snapshot-v1.md); unknown kinds sort last.
const GROUP_KIND_ORDER = ["season", "specials", "movie", "ova", "credits", "trailers", "parodies"];

function kindRank(kind: string): number {
  const index = GROUP_KIND_ORDER.indexOf(kind);
  return index < 0 ? GROUP_KIND_ORDER.length : index;
}

/** Stable kind-priority ordering: seasons first (numbered), then specials, movies, ova, rest. */
export function orderGroupsByKind<T extends { kind?: string }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => kindRank(a.kind ?? "") - kindRank(b.kind ?? ""));
}

/** Localized generic label for a group kind (cluster headers, fallback labels). No episode counts. */
export function groupKindLabel(kind: string, t: TFunction<"media">): string {
  switch (kind) {
    case "season":
      return t("seasons.seasonsHeader");
    case "specials":
      return t("seasons.specials");
    case "movie":
      return t("seasons.movie");
    case "ova":
      return t("seasons.ova");
    case "credits":
      return t("seasons.credits");
    case "trailers":
      return t("seasons.trailers");
    case "parodies":
      return t("seasons.parodies");
    default:
      return kind;
  }
}

/**
 * Finalizes a group label: number + title when both exist ("Сезон 3: Entertainment District Arc"),
 * the bare title when only a title exists, otherwise a localized generic label per kind.
 */
export function finalizeGroupTitle(group: EpisodeGroupPresentation, t: TFunction<"media">): string {
  const number = group.titleFallback?.number ?? group.displayNumber ?? null;
  if (group.title) {
    if (group.kind === "season" && number !== null) {
      return t("seasons.seasonTitled", { number, title: group.title });
    }
    return group.title;
  }
  const kind = group.titleFallback?.kind ?? group.kind;
  if (kind === "season") {
    return t("seasons.season", { number: number ?? 0 });
  }
  return groupKindLabel(kind, t);
}

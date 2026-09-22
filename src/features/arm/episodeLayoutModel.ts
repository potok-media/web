import type { TvEpisode } from "../../network/ApiTypes";
import type {
  ArmEpisodeLayoutResponse,
  ArmEpisodePlacement,
  ArmLocalizedText,
  ArmName,
  ArmProvisionalLayout,
  ArmProviderReference,
} from "../../network/ArmTypes";
import { resizeTmdbImage } from "../../utils/mediaUtils";

// Matches the legacy season pipeline (useSeasonEpisodes.ts): episode stills decode at w500.
const STILL_SIZE = "w500";

export interface EpisodeGroupTitleFallback {
  kind: "season";
  number: number | null;
}

export interface EpisodeGroupPresentation {
  id: string;
  kind: string;
  title: string;
  /** Set when the title must be finalized by the component (localized "Season {number}"). */
  titleFallback?: EpisodeGroupTitleFallback;
  displayNumber?: number | null;
  episodes: TvEpisode[];
}

export interface EpisodeLayoutPresentationOptions {
  /** Gateway base URL used to proxy raw TMDB-relative still paths. */
  imageBaseUrl?: string;
}

interface EpisodeCoordinates {
  season: number;
  episode: number;
}

function parseTmdbEpisodeReference(reference: ArmProviderReference): EpisodeCoordinates | null {
  if (reference.provider !== "tmdb" || reference.entityKind !== "tv-episode") return null;
  const match = /^(?:\d+)\/(\d+)\/(\d+)$/.exec(reference.value);
  if (!match) return null;
  return { season: Number(match[1]), episode: Number(match[2]) };
}

function finiteNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function displayEpisodeNumber(episode: ArmEpisodePlacement): number {
  const explicit = finiteNumber(episode.displayEpisodeNumber);
  if (explicit !== undefined) return explicit;
  const ordinal = Number(episode.ordinal);
  return Number.isFinite(ordinal) ? ordinal : 0;
}

function textValue(value: string | ArmLocalizedText | null | undefined): string | undefined {
  if (!value) return undefined;
  const raw = typeof value === "string" ? value : value.value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

function firstName(names: ArmName[] | undefined): string | undefined {
  for (const name of names ?? []) {
    const value = name.value?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Numeric ordinals duplicate the episode number ("1. 1"); only labels like "OVA 1" qualify. */
function ordinalLabel(ordinal: string | null | undefined): string | undefined {
  const trimmed = ordinal?.trim();
  if (!trimmed || /^\d+(\.\d+)?$/.test(trimmed)) return undefined;
  return trimmed;
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

function groupTitle(group: {
  kind: string;
  displayNumber?: number | null;
  displayTitle: ArmLocalizedText | string | null | undefined;
  names?: ArmName[];
}): { title: string; titleFallback?: EpisodeGroupTitleFallback } {
  const explicit = textValue(group.displayTitle) ?? firstName(group.names);
  if (explicit) return { title: explicit };
  if (group.kind === "season") {
    return {
      title: "",
      titleFallback: { kind: "season", number: finiteNumber(group.displayNumber) ?? null },
    };
  }
  return { title: group.kind };
}

export function toEpisodeGroupPresentations(
  layout: ArmEpisodeLayoutResponse,
  options?: EpisodeLayoutPresentationOptions,
): EpisodeGroupPresentation[] {
  return [...layout.groups]
    .sort((a, b) => a.sortPosition - b.sortPosition)
    .map((group) => ({
      id: group.id,
      kind: group.kind,
      ...groupTitle(group),
      displayNumber: group.displayNumber,
      episodes: [...group.episodes]
        .sort((a, b) => a.sortPosition - b.sortPosition)
        .map((episode): TvEpisode => {
          const tmdb = episode.providerReferences
            .map(parseTmdbEpisodeReference)
            .find((coordinates): coordinates is EpisodeCoordinates => coordinates !== null);

          return {
            id: episode.id,
            name: textValue(episode.displayTitle)
              ?? firstName(episode.names)
              ?? ordinalLabel(episode.ordinal)
              ?? "",
            overview: episode.overview ?? undefined,
            episodeNumber: displayEpisodeNumber(episode),
            seasonNumber: finiteNumber(episode.displaySeasonNumber) ?? group.displayNumber ?? 0,
            airDate: episode.airDate ?? undefined,
            stillPath: stillUrl(episode.stillPath, options?.imageBaseUrl),
            armEpisodeId: episode.id,
            armGroupId: group.id,
            armOrderingId: layout.ordering?.id,
            armOrdinal: episode.ordinal,
            armAnnotation: episode.annotation,
            tmdbSeasonNumber: tmdb?.season,
            tmdbEpisodeNumber: tmdb?.episode,
          };
        }),
    }));
}

/**
 * Maps the TMDB-cache provisional structure to the same presentation shape. Provisional episodes
 * have no Potok identity, so `armEpisodeId` stays absent and the legacy season/episode coordinates
 * carry watched-state matching, bulk toggles and streams navigation.
 */
export function toProvisionalGroupPresentations(
  provisional: ArmProvisionalLayout,
  options?: EpisodeLayoutPresentationOptions,
): EpisodeGroupPresentation[] {
  return provisional.groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => (finiteNumber(a.group.sortPosition) ?? a.index) - (finiteNumber(b.group.sortPosition) ?? b.index))
    .map(({ group, index }) => {
      const kind = group.kind?.trim() || "season";
      const displayNumber = finiteNumber(group.displayNumber) ?? null;
      return {
        id: `provisional-${displayNumber ?? index}`,
        kind,
        ...groupTitle({ kind, displayNumber, displayTitle: group.displayTitle }),
        displayNumber,
        episodes: group.episodes.map((episode, episodeIndex): TvEpisode => {
          const seasonNumber = finiteNumber(episode.displaySeasonNumber) ?? displayNumber ?? 0;
          const episodeNumber = finiteNumber(episode.displayEpisodeNumber) ?? episodeIndex + 1;
          return {
            id: `provisional-${seasonNumber}-${episodeNumber}`,
            name: textValue(episode.displayTitle) ?? "",
            overview: episode.overview ?? undefined,
            episodeNumber,
            seasonNumber,
            airDate: episode.airDate ?? undefined,
            stillPath: stillUrl(episode.stillPath, options?.imageBaseUrl),
          };
        }),
      };
    });
}

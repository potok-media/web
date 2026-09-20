import type { TvEpisode } from "../../network/ApiTypes";
import type {
  ArmEpisodeLayoutResponse,
  ArmEpisodePlacement,
  ArmProviderReference,
} from "../../network/ArmTypes";

export interface EpisodeGroupPresentation {
  id: string;
  kind: string;
  title: string;
  displayNumber?: number | null;
  episodes: TvEpisode[];
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

export function toEpisodeGroupPresentations(
  layout: ArmEpisodeLayoutResponse,
): EpisodeGroupPresentation[] {
  return layout.groups.map((group) => ({
    id: group.id,
    kind: group.kind,
    title: group.displayTitle?.value ?? group.kind,
    displayNumber: group.displayNumber,
    episodes: group.episodes.map((episode): TvEpisode => {
      const tmdb = episode.providerReferences
        .map(parseTmdbEpisodeReference)
        .find((coordinates): coordinates is EpisodeCoordinates => coordinates !== null);

      return {
        id: episode.id,
        name: episode.displayTitle?.value ?? episode.ordinal,
        overview: episode.overview ?? undefined,
        episodeNumber: displayEpisodeNumber(episode),
        seasonNumber: finiteNumber(episode.displaySeasonNumber) ?? group.displayNumber ?? 0,
        airDate: episode.airDate ?? undefined,
        stillPath: episode.stillPath ?? undefined,
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

import type {
  SDKMediaCard,
  SDKSelectedEpisodeType,
  SDKStreamEpisode,
  SDKTvEpisode,
} from "@potok/sdk-types";
import type { HeroItem, MediaCard as ApiMediaCard, TvEpisode } from "../../../../network/ApiTypes";
import type { GenericEpisodeItem } from "../../EpisodeSelectorPopup";

export function asApiMediaCard(item: SDKMediaCard): ApiMediaCard {
  return item as unknown as ApiMediaCard;
}

export function mapSdkTvEpisode(episode: SDKTvEpisode, seasonNumber: number): TvEpisode {
  return {
    id: Number(episode.id ?? 0),
    name: episode.name ?? "",
    overview: episode.overview,
    episodeNumber: episode.episodeNumber ?? episode.episode_number ?? 0,
    seasonNumber,
    airDate: episode.airDate ?? episode.air_date,
    stillPath: episode.stillPath ?? episode.still_path,
    still_path: episode.still_path ?? episode.stillPath,
    filler: episode.filler,
  };
}

export function mapSdkSelectedEpisode(
  selected: SDKSelectedEpisodeType | null | undefined,
): { episode: TvEpisode; seasonNumber: number } | null {
  if (!selected) return null;
  return {
    episode: mapSdkTvEpisode(selected.episode, selected.seasonNumber),
    seasonNumber: selected.seasonNumber,
  };
}

export function normalizeHeroItems(
  items: Array<SDKMediaCard | HeroItem | { card: SDKMediaCard }> | undefined,
): HeroItem[] {
  return (items ?? []).map((item) => {
    if (item && typeof item === "object" && "card" in item && item.card) {
      const hero = item as HeroItem;
      if (hero.backdropSrc !== undefined) return hero;
      const card = asApiMediaCard(item.card as SDKMediaCard);
      return {
        id: card.id,
        card,
        backdropSrc: card.backdropSrc || card.posterSrc,
      };
    }
    const card = asApiMediaCard(item as SDKMediaCard);
    return {
      id: card.id,
      card,
      backdropSrc: card.backdropSrc || card.posterSrc,
    };
  });
}

export function mapSdkStreamEpisodes(episodes: SDKStreamEpisode[] | undefined): GenericEpisodeItem[] {
  return (episodes ?? []).map((ep) => ({
    id: ep.id,
    season: ep.season,
    episode: ep.episode,
    rawSeason: ep.rawSeason,
    rawEpisode: ep.rawEpisode,
    workId: ep.workId,
    episodeId: ep.episodeId,
    entryId: ep.entryId,
    groupTitle: ep.groupTitle,
    groupDisplayNumber: ep.groupDisplayNumber,
    groupKind: ep.groupKind,
    displayOrdinal: ep.displayOrdinal,
    episodeIds: ep.episodeIds,
    targets: ep.targets,
    resolutionState: ep.resolutionState,
    confidence: ep.confidence,
    bindingMethod: ep.bindingMethod,
    rawEvidence: ep.rawEvidence,
    alternatives: ep.alternatives,
    filler: ep.filler,
    title: ep.title,
    stillPath: ep.stillPath,
    airDate: ep.airDate,
    progressId: ep.progressId,
    playbackStatus: ep.playbackStatus,
    audios: ep.audios || [],
    url: ep.url,
  }));
}

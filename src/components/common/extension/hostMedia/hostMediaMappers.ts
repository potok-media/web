import type {
  SDKMediaCard,
  SDKPlaybackInfo,
  SDKSelectedEpisodeType,
  SDKStreamEpisode,
  SDKTvEpisode,
} from "@potok/sdk-types";
import type { ActivePlayback } from "../../../../context/AppSettingsContext";
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

export function mapSdkPlayback(playback: SDKPlaybackInfo): ActivePlayback {
  return {
    streamUrl: playback.streamUrl,
    title: playback.title,
    mediaType: playback.season !== undefined ? "tv" : "movie",
    id: 0,
    season: playback.season,
    episode: playback.episode,
    streamHash: playback.torrentHash,
    streamType: playback.streamType as "m3u8" | "mp4" | "dash" | undefined,
    audios: playback.audios?.map((a) => ({ name: a.name, url: a.url })),
    headers: playback.headers,
    providerId: playback.providerId,
    voice: playback.voice,
  };
}

export function mapSdkStreamEpisodes(episodes: SDKStreamEpisode[] | undefined): GenericEpisodeItem[] {
  return (episodes ?? []).map((ep) => ({
    id: ep.id,
    season: ep.season,
    episode: ep.episode,
    title: ep.title,
    stillPath: ep.stillPath,
    airDate: ep.airDate,
    audios: ep.audios || [],
    url: ep.url,
  }));
}
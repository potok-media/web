import React from "react";
import type {
  EpisodeCardSchema,
  EpisodeSelectorSchema,
  EpisodesSectionSchema,
  EpisodeSelectorPopupSchema,
  SeasonEpisodesSchema,
  HeroSpotlightSchema,
  MediaCardSchema,
  MediaCastSchema,
  MediaOverviewSchema,
  MediaPlayerSchema,
  MediaRowSchema,
  SDKMediaCard,
  SDKTvEpisode,
} from "@potok/sdk-types";
import type { HeroItem, MediaCard as ApiMediaCard, TvEpisode } from "../../../../network/ApiTypes";
import { ExtensionRegistry } from "../../../../utils/extensions/ExtensionRegistry";
import MediaCardComponent from "../../../MediaCardComponent";
import HeroSpotlight from "../../../HeroSpotlight";
import { SeasonEpisodesSection } from "../../../SeasonEpisodesSection";
import MediaCastSection from "../../../MediaCastSection";
import { MediaOverviewSection } from "../../../MediaOverviewSection";
import MediaRow from "../../../MediaRow";
import { WebMediaPlayer } from "../../../WebMediaPlayer";
import EpisodeSelectorPopup, { type GenericEpisodeItem } from "../../EpisodeSelectorPopup";
import { EpisodeCard } from "../../../EpisodeCard";
import type { HostMediaRendererProps } from "./types";
import { sdkClass, sdkStyleVars } from "../componentRendererUtils";
import {
  asApiMediaCard,
  mapSdkPlayback,
  mapSdkSelectedEpisode,
  mapSdkStreamEpisodes,
  mapSdkTvEpisode,
  normalizeHeroItems,
} from "./hostMediaMappers";

export const HostMediaCardCase: React.FC<HostMediaRendererProps<MediaCardSchema>> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, props, events } = schema;
  if (!props.item) return null;

  const handleClick = (item: ApiMediaCard) => {
    if (events?.onClick) ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, item);
  };

  return (
    <div id={id} className={sdkClass(schema, "host-media-card-wrap")} style={sdkStyleVars(baseStyle)}>
      <MediaCardComponent item={asApiMediaCard(props.item)} onClick={handleClick} />
    </div>
  );
};

export const HostHeroSpotlightCase: React.FC<HostMediaRendererProps<HeroSpotlightSchema>> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, props, events } = schema;

  const handleDetails = (item: HeroItem) => {
    if (events?.onDetails) ExtensionRegistry.triggerUIEvent(pluginId, events.onDetails, item.card);
  };

  const handlePlay = (item: HeroItem) => {
    if (events?.onPlay) ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, item.card);
    else handleDetails(item);
  };

  return (
    <div id={id} className={sdkClass(schema, "host-hero-spotlight-wrap")} style={sdkStyleVars(baseStyle)}>
      <HeroSpotlight
        items={normalizeHeroItems(props.items as Array<SDKMediaCard | HeroItem>)}
        onPlay={handlePlay}
        onDetails={handleDetails}
      />
    </div>
  );
};

export const HostSeasonEpisodesCase: React.FC<
  HostMediaRendererProps<EpisodesSectionSchema | SeasonEpisodesSchema>
> = ({ schema, pluginId }) => {
  const { id, props, events } = schema;

  const handleEpisodeClick = (episode: TvEpisode, seasonNumber: number) => {
    if (events?.onEpisodeClick) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onEpisodeClick, { episode, seasonNumber });
    }
  };

  return (
    <SeasonEpisodesSection
      key={id}
      mediaId={props.mediaId || 0}
      numberOfSeasons={props.numberOfSeasons || 0}
      onEpisodeClick={handleEpisodeClick}
    />
  );
};

export const HostMediaCastCase: React.FC<HostMediaRendererProps<MediaCastSchema>> = ({ schema }) => {
  const { id, props } = schema;
  return <MediaCastSection key={id} cast={props.cast || []} />;
};

export const HostMediaOverviewCase: React.FC<HostMediaRendererProps<MediaOverviewSchema>> = ({
  schema,
  pluginId,
}) => {
  const { id, props, events } = schema;
  if (!props.media) return null;

  const handleSetSelectedEpisode = (val: { episode: TvEpisode; seasonNumber: number } | null) => {
    if (val === null && events?.onResetEpisode) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onResetEpisode, {});
    }
  };

  return (
    <MediaOverviewSection
      key={id}
      media={asApiMediaCard(props.media)}
      selectedEpisode={mapSdkSelectedEpisode(props.selectedEpisode)}
      setSelectedEpisode={handleSetSelectedEpisode}
    />
  );
};

export const HostMediaRowCase: React.FC<HostMediaRendererProps<MediaRowSchema>> = ({
  schema,
  pluginId,
}) => {
  const { id, props, events } = schema;
  const rowId = props.name || schema.id;

  const handleCardClick = (item: ApiMediaCard) => {
    if (events?.onCardClick) ExtensionRegistry.triggerUIEvent(pluginId, events.onCardClick, item);
  };

  const handleSeeAllClick = (categoryId: string, categoryTitle: string) => {
    if (events?.onSeeAllClick) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onSeeAllClick, { id: categoryId, title: categoryTitle });
    }
  };

  return (
    <MediaRow
      key={id}
      id={rowId}
      title={props.title || ""}
      items={(props.items ?? []).map(asApiMediaCard)}
      onCardClick={handleCardClick}
      onSeeAllClick={events?.onSeeAllClick ? handleSeeAllClick : undefined}
    />
  );
};

export const HostMediaPlayerCase: React.FC<HostMediaRendererProps<MediaPlayerSchema>> = ({ schema }) => {
  const { id, props } = schema;
  if (!props.playback) return null;

  return (
    <WebMediaPlayer
      key={id}
      playback={mapSdkPlayback(props.playback)}
      isNetworkOffline={props.isNetworkOffline}
    />
  );
};

export const HostEpisodeSelectorCase: React.FC<
  HostMediaRendererProps<EpisodeSelectorSchema | EpisodeSelectorPopupSchema>
> = ({
  schema,
  pluginId,
}) => {
  const { id, props, events } = schema;

  const handleClose = () => {
    if (events?.onClose) ExtensionRegistry.triggerUIEvent(pluginId, events.onClose, {});
  };

  const handlePlay = (episode: GenericEpisodeItem, audioId: string) => {
    if (events?.onPlay) ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, { episode, audioId });
  };

  return (
    <EpisodeSelectorPopup
      key={id}
      isOpen={!!props.isOpen}
      onClose={handleClose}
      title={props.title || ""}
      subtitle={props.subtitle}
      episodes={mapSdkStreamEpisodes(props.episodes)}
      onPlay={handlePlay}
      onApplyOverride={
        events?.onApplyOverride
          ? (sourceSeason, targetSeason, offset) => {
              ExtensionRegistry.triggerUIEvent(pluginId, events.onApplyOverride!, {
                sourceSeason,
                targetSeason,
                offset,
              });
            }
          : undefined
      }
      onStartEditing={
        events?.onStartEditing
          ? () => ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEditing!, {})
          : undefined
      }
      backdropSrc={props.backdropSrc}
      seasonsLoading={props.seasonsLoading}
      seasons={props.seasons}
    />
  );
};

export const HostEpisodeCardCase: React.FC<HostMediaRendererProps<EpisodeCardSchema>> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, props, events } = schema;
  if (!props.episode) return null;

  const seasonNumber = (props.episode as SDKTvEpisode & { seasonNumber?: number }).seasonNumber ?? 0;
  const episode = mapSdkTvEpisode(props.episode, seasonNumber);

  const handleClick = () => {
    if (events?.onClick) ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, props.episode);
  };

  return (
    <div id={id} className={sdkClass(schema, "host-episode-card-wrap")} style={sdkStyleVars(baseStyle)}>
      <EpisodeCard episode={episode} onClick={handleClick} />
    </div>
  );
};
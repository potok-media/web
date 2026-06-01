import React from "react";
import type {
  UIComponentSchema,
  SelectedEpisodeType,
} from "../../../network/SDKTypes";
import type {
  MediaCard as ApiMediaCard,
  TvEpisode,
  HeroItem,
} from "../../../network/ApiTypes";
import type { GenericEpisodeItem } from "../EpisodeSelectorPopup";
import type { ActivePlayback } from "../../../context/AppSettingsContext";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

import MediaCardComponent from "../../MediaCardComponent";
import HeroSpotlight from "../../HeroSpotlight";
import { SeasonEpisodesSection } from "../../SeasonEpisodesSection";
import MediaCastSection from "../../MediaCastSection";
import { MediaOverviewSection } from "../../MediaOverviewSection";
import MediaRow from "../../MediaRow";
import { WebMediaPlayer } from "../../WebMediaPlayer";
import EpisodeSelectorPopup from "../EpisodeSelectorPopup";

interface HostMediaComponentsRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const HostMediaComponentsRenderer: React.FC<HostMediaComponentsRendererProps> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { type, id, props: componentProps, events } = schema;

  switch (type) {
    case "MediaCard": {
      const handleMediaCardClick = (item: ApiMediaCard) => {
        if (events?.onClick) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, item);
        }
      };
      if (!componentProps.item) return null;
      return (
        <div key={id} style={{ width: "160px", ...baseStyle }}>
          <MediaCardComponent
            item={componentProps.item}
            onClick={handleMediaCardClick}
          />
        </div>
      );
    }

    case "HeroSpotlight": {
      const handleDetails = (item: HeroItem) => {
        if (events?.onDetails) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onDetails, item.card);
        }
      };
      const handlePlay = (item: HeroItem) => {
        if (events?.onPlay) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, item.card);
        } else {
          handleDetails(item);
        }
      };

      const spotlightItems: HeroItem[] = (componentProps.items || []).map((item) => {
        if (item && 'card' in item) {
          return item as unknown as HeroItem;
        } else {
          const card = item as ApiMediaCard;
          return {
            id: card.id,
            card: card,
            backdropSrc: card.backdropSrc || card.posterSrc,
          };
        }
      });

      return (
        <div key={id} style={{ width: "100%", borderRadius: "12px", overflow: "hidden", ...baseStyle }}>
          <HeroSpotlight
            items={spotlightItems}
            onPlay={handlePlay}
            onDetails={handleDetails}
          />
        </div>
      );
    }

    case "SeasonEpisodes": {
      const { mediaId, numberOfSeasons } = componentProps;
      const handleEpisodeClick = (episode: TvEpisode, seasonNumber: number) => {
        if (events?.onEpisodeClick) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onEpisodeClick, { episode, seasonNumber });
        }
      };
      return (
        <SeasonEpisodesSection
          key={id}
          mediaId={mediaId || 0}
          numberOfSeasons={numberOfSeasons || 0}
          onEpisodeClick={handleEpisodeClick}
        />
      );
    }

    case "MediaCast": {
      const { cast } = componentProps;
      return (
        <MediaCastSection
          key={id}
          cast={cast || []}
        />
      );
    }

    case "MediaOverview": {
      const { media, selectedEpisode } = componentProps;
      const handleSetSelectedEpisode = (val: SelectedEpisodeType | null) => {
        if (val === null && events?.onResetEpisode) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onResetEpisode, {});
        }
      };
      if (!media) return null;
      return (
        <MediaOverviewSection
          key={id}
          media={media}
          selectedEpisode={selectedEpisode || null}
          setSelectedEpisode={handleSetSelectedEpisode}
        />
      );
    }

    case "MediaRow": {
      const { title, items } = componentProps;
      const rowId = componentProps.name || schema.id;
      const handleCardClick = (item: ApiMediaCard) => {
        if (events?.onCardClick) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onCardClick, item);
        }
      };
      const handleSeeAllClick = (cId: string, cTitle: string) => {
        if (events?.onSeeAllClick) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onSeeAllClick, { id: cId, title: cTitle });
        }
      };
      return (
        <MediaRow
          key={id}
          id={rowId}
          title={title || ""}
          items={items || []}
          onCardClick={handleCardClick}
          onSeeAllClick={events?.onSeeAllClick ? handleSeeAllClick : undefined}
        />
      );
    }

    case "MediaPlayer": {
      const { playback, isNetworkOffline } = componentProps;
      if (!playback) return null;

      const activePlayback: ActivePlayback = {
        streamUrl: playback.streamUrl,
        title: playback.title,
        mediaType: playback.season !== undefined ? "tv" : "movie",
        id: 0, // Fallback ID for player server
        season: playback.season,
        episode: playback.episode,
        streamHash: playback.torrentHash,
        streamType: playback.streamType as "m3u8" | "mp4" | "dash" | undefined,
        audios: playback.audios?.map((a) => ({ name: a.name, url: a.url })),
        headers: playback.headers,
        providerId: playback.providerId,
        voice: playback.voice,
      };

      return (
        <WebMediaPlayer
          key={id}
          playback={activePlayback}
          isNetworkOffline={isNetworkOffline}
        />
      );
    }

    case "EpisodeSelectorPopup": {
      const { isOpen, title, subtitle, episodes, backdropSrc, seasonsLoading, seasons } = componentProps;
      const handleClose = () => {
        if (events?.onClose) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onClose, {});
        }
      };
      const handlePlay = (episode: GenericEpisodeItem, audioId: string) => {
        if (events?.onPlay) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, { episode, audioId });
        }
      };
      const handleApplyOverride = (seasonNum: number, epNum: number) => {
        if (events?.onApplyOverride) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onApplyOverride, { seasonNum, epNum });
        }
      };
      const handleStartEditing = () => {
        if (events?.onStartEditing) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEditing, {});
        }
      };

      const genericEpisodes: GenericEpisodeItem[] = (episodes || []).map((ep) => ({
        id: ep.id,
        season: ep.season,
        episode: ep.episode,
        title: ep.title,
        stillPath: ep.stillPath,
        airDate: ep.airDate,
        audios: ep.audios || [],
        url: ep.url,
      }));

      return (
        <EpisodeSelectorPopup
          key={id}
          isOpen={!!isOpen}
          onClose={handleClose}
          title={title || ""}
          subtitle={subtitle}
          episodes={genericEpisodes}
          onPlay={handlePlay}
          onApplyOverride={events?.onApplyOverride ? handleApplyOverride : undefined}
          onStartEditing={events?.onStartEditing ? handleStartEditing : undefined}
          backdropSrc={backdropSrc}
          seasonsLoading={seasonsLoading}
          seasons={seasons}
        />
      );
    }

    default:
      return null;
  }
};

import React, { useEffect, useState } from "react";
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
  InlinePlayerSchema,
  OverlayPlayerSchema,
  MediaRowSchema,
  SDKMediaCard,
  SDKTvEpisode,
  UIComponentSchema,
} from "@potok/sdk-types";
import type { HeroItem, MediaCard as ApiMediaCard, TvEpisode } from "../../../../network/ApiTypes";
import { usePlayback } from "../../../../context/PlaybackContext";
import { useWatchTogether } from "../../../../context/watchTogetherState";
import { ExtensionRegistry, type PresentedEpisodesPanel } from "../../../../utils/extensions/ExtensionRegistry";
import MediaCardComponent from "../../../MediaCardComponent";
import { LoadingSpinner } from "../../../LoadingSpinner";
import HeroSpotlight from "../../../HeroSpotlight";
import { SeasonEpisodesSection } from "../../../SeasonEpisodesSection";
import MediaCastSection from "../../../MediaCastSection";
import { MediaOverviewSection } from "../../../MediaOverviewSection";
import MediaRow from "../../../MediaRow";
import { PlaybackStageLayout } from "../../../playback/PlaybackStageLayout";
import { InlinePlayer } from "../../../player/InlinePlayer";
import EpisodeSelectorPopup, { type GenericEpisodeItem } from "../../EpisodeSelectorPopup";
import { EpisodeSelectorContent } from "../../EpisodeSelectorContent";
import { EpisodeCard } from "../../../EpisodeCard";
import type { HostMediaRendererProps } from "./types";
import { sdkClass, sdkStyleVars } from "../componentRendererUtils";
import {
  asApiMediaCard,
  mapSdkSelectedEpisode,
  mapSdkStreamEpisodes,
  mapSdkTvEpisode,
  normalizeHeroItems,
} from "./hostMediaMappers";
import { resolvePresentedEpisodePanelView } from "./presentedEpisodePanelView";
import { reorderPlaylistKeepingCurrent } from "../../../../utils/queueOrder";

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

interface HostInlinePlayerCaseProps extends HostMediaRendererProps<InlinePlayerSchema> {
  renderChild: (child: UIComponentSchema, index: number) => React.ReactNode;
}

// Episode panel the host renders from data handed over via ui.presentEpisodes. The plugin no longer
// draws its own panel, so the rail composes the platform EpisodeSelectorContent and takes the active
// episode highlight from the playback playlist — no plugin-side sync events involved.
const PresentedEpisodesRail: React.FC<{
  panel: PresentedEpisodesPanel;
  baseStyle: React.CSSProperties;
}> = ({ panel, baseStyle }) => {
  const { activePlayback, replacePlaylist } = usePlayback();
  const watchTogether = useWatchTogether();
  const hidePanelHeader = Boolean(watchTogether.role && watchTogether.sessionActive);
  const view = resolvePresentedEpisodePanelView(panel, activePlayback);
  // The panel's rows come from plugin-presented data, but the player's «next» follows
  // activePlayback.playlist — a reorder has to rewrite the actual playlist (current episode keeps
  // its slot; nothing switches) or the visual order and the playback order diverge.
  const handleReorderEpisodes = (episodes: GenericEpisodeItem[]) => {
    panel.onReorderEpisodes?.(episodes);
    if (!activePlayback?.playlist?.length) return;
    const reordered = reorderPlaylistKeepingCurrent(
      activePlayback.playlist,
      episodes.map((item) => item.id),
      activePlayback.playlistIndex ?? 0,
    );
    replacePlaylist(reordered.playlist, reordered.playlistIndex);
    if (watchTogether.role === "host" && watchTogether.sessionActive) {
      watchTogether.hostUpdateQueue(reordered.playlist, reordered.playlistIndex);
    }
  };

  return (
    <div className="sdk-episode-selector-panel streams-inline-workspace--split" style={sdkStyleVars(baseStyle)}>
      <section className="torrent-files-panel" aria-label={panel.title || undefined}>
        <EpisodeSelectorContent
          isOpen
          onClose={() => panel.onClose?.()}
          title={panel.title || ""}
          subtitle={panel.subtitle}
          episodes={view.episodes}
          onPlay={(episode, audioId) => panel.onPlay?.(episode, audioId)}
          presentation="playlist"
          hideHeader={hidePanelHeader}
          activeEpisodeId={view.activeEpisodeId}
          canReorder={Boolean(panel.canReorder) && watchTogether.role !== "guest"}
          onReorderEpisodes={
            panel.onReorderEpisodes
              ? (episodes) => handleReorderEpisodes(episodes)
              : undefined
          }
        />
      </section>
    </div>
  );
};

export const HostInlinePlayerCase: React.FC<HostInlinePlayerCaseProps> = ({
  schema,
  pluginId,
  baseStyle,
  renderChild,
}) => {
  // Episodes a plugin handed over as data (ui.presentEpisodes). Subscribe to registry updates so the
  // rail appears/disappears without waiting for the plugin's next slot render.
  const { activePlayback, stopVideo } = usePlayback();
  const [episodePanel, setEpisodePanel] = useState(() => ExtensionRegistry.getPresentedEpisodes(pluginId));
  useEffect(() => {
    const syncPanel = () => setEpisodePanel(ExtensionRegistry.getPresentedEpisodes(pluginId));
    syncPanel();
    ExtensionRegistry.addListener(syncPanel);
    return () => ExtensionRegistry.removeListener(syncPanel);
  }, [pluginId]);

  const schemaRail = schema.children?.[0];
  // A schema-authored rail (legacy EpisodeSelector child or any other component) wins over presented
  // data — the panel only fills the rail when the plugin left it empty.
  const presentedRail = !schemaRail && episodePanel
    ? <PresentedEpisodesRail panel={episodePanel} baseStyle={baseStyle} />
    : undefined;
  const coWatchQueueCount = schemaRail
    ? (schemaRail.type === "EpisodeSelector" || schemaRail.type === "EpisodeSelectorPopup"
        ? schemaRail.props.episodes?.length || 0
        : 0)
    : episodePanel?.episodes.length || 0;

  return (
    <PlaybackStageLayout
      id={schema.id}
      className={sdkClass(schema, "sdk-inline-player")}
      style={sdkStyleVars(baseStyle)}
      backdropSrc={schema.props.backdropSrc}
      rail={schemaRail ? renderChild(schemaRail, 0) : presentedRail}
      coWatchQueueCount={coWatchQueueCount}
    >
      {activePlayback?.mount === "inline" ? (
        <InlinePlayer playback={activePlayback} onClose={stopVideo} />
      ) : schema.props.loading ? (
        <div className="sdk-inline-player-loading" role="status">
          <LoadingSpinner />
        </div>
      ) : null}
    </PlaybackStageLayout>
  );
};

// The overlay slot is owned by AppLayout (mount === 'overlay' → OverlayPlayer in document.body).
// A plugin page embedding OverlayPlayer changes nothing — the host deliberately renders nothing here.
export const HostOverlayPlayerCase: React.FC<HostMediaRendererProps<OverlayPlayerSchema>> = () => null;

export const HostEpisodeSelectorCase: React.FC<
  HostMediaRendererProps<EpisodeSelectorSchema | EpisodeSelectorPopupSchema>
> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, props, events } = schema;
  const watchTogether = useWatchTogether();
  const hidePanelHeader = Boolean(watchTogether.role && watchTogether.sessionActive);

  const handleClose = () => {
    if (events?.onClose) ExtensionRegistry.triggerUIEvent(pluginId, events.onClose, {});
  };

  const handlePlay = (episode: GenericEpisodeItem, audioId: string) => {
    if (events?.onPlay) ExtensionRegistry.triggerUIEvent(pluginId, events.onPlay, { episode, audioId });
  };

  const handleApplyOverride = events?.onApplyOverride
    ? (sourceSeason: number | null, targetSeason: number, offset: number) => {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onApplyOverride!, {
          sourceSeason,
          targetSeason,
          offset,
        });
      }
    : undefined;

  const handleStartEditing = events?.onStartEditing
    ? () => ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEditing!, {})
    : undefined;

  const handleReorderEpisodes = events?.onReorder
    ? (episodes: GenericEpisodeItem[]) => {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onReorder!, episodes);
      }
    : undefined;

  const episodes = mapSdkStreamEpisodes(props.episodes);

  if (props.presentation === "panel") {
    if (!props.isOpen) return null;

    return (
      <div
        id={id}
        className={sdkClass(schema, "sdk-episode-selector-panel", "streams-inline-workspace--split")}
        style={sdkStyleVars(baseStyle)}
      >
        <section className="torrent-files-panel" aria-label={props.title || undefined}>
          <EpisodeSelectorContent
            isOpen
            onClose={handleClose}
            title={props.title || ""}
            subtitle={props.subtitle}
            episodes={episodes}
            onPlay={handlePlay}
            onApplyOverride={handleApplyOverride}
            onStartEditing={handleStartEditing}
            backdropSrc={props.backdropSrc}
            seasonsLoading={props.seasonsLoading}
            seasons={props.seasons}
            presentation="playlist"
            hideHeader={hidePanelHeader}
            activeEpisodeId={props.activeEpisodeId}
            canReorder={!!props.canReorder}
            onReorderEpisodes={handleReorderEpisodes}
          />
        </section>
      </div>
    );
  }

  return (
    <EpisodeSelectorPopup
      key={id}
      isOpen={!!props.isOpen}
      onClose={handleClose}
      title={props.title || ""}
      subtitle={props.subtitle}
      episodes={episodes}
      onPlay={handlePlay}
      onApplyOverride={handleApplyOverride}
      onStartEditing={handleStartEditing}
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

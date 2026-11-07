import React from "react";
import type { UIComponentSchema } from "@potok/sdk-types";
import {
  HostEpisodeCardCase,
  HostEpisodeSelectorCase,
  HostHeroSpotlightCase,
  HostMediaCardCase,
  HostMediaCastCase,
  HostMediaOverviewCase,
  HostInlinePlayerCase,
  HostOverlayPlayerCase,
  HostMediaRowCase,
  HostSeasonEpisodesCase,
} from "./hostMedia/hostMediaCases";

interface HostMediaComponentsRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
  renderChild: (child: UIComponentSchema, index: number) => React.ReactNode;
}

export const HostMediaComponentsRenderer: React.FC<HostMediaComponentsRendererProps> = ({
  schema,
  pluginId,
  baseStyle,
  renderChild,
}) => {
  switch (schema.type) {
    case "MediaCard":
      return <HostMediaCardCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "HeroSpotlight":
      return <HostHeroSpotlightCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "EpisodesSection":
    case "SeasonEpisodes":
      return <HostSeasonEpisodesCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "MediaCast":
      return <HostMediaCastCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "MediaOverview":
      return <HostMediaOverviewCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "MediaRow":
      return <HostMediaRowCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "InlinePlayer":
      return (
        <HostInlinePlayerCase
          schema={schema}
          pluginId={pluginId}
          baseStyle={baseStyle}
          renderChild={renderChild}
        />
      );
    case "OverlayPlayer":
      return <HostOverlayPlayerCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "EpisodeSelector":
    case "EpisodeSelectorPopup":
      return <HostEpisodeSelectorCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    case "EpisodeCard":
      return <HostEpisodeCardCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    default:
      return null;
  }
};

export default HostMediaComponentsRenderer;

import React from "react";
import type { UIComponentSchema } from "@potok/sdk-types";
import {
  HostEpisodeCardCase,
  HostEpisodeSelectorCase,
  HostHeroSpotlightCase,
  HostMediaCardCase,
  HostMediaCastCase,
  HostMediaOverviewCase,
  HostMediaPlayerCase,
  HostMediaRowCase,
  HostSeasonEpisodesCase,
} from "./hostMedia/hostMediaCases";

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
    case "MediaPlayer":
      return <HostMediaPlayerCase schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
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
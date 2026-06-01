import React from "react";
import type {
  UIComponentSchema,
  RawStreamPayload,
} from "../../../network/SDKTypes";
import type { ConnectionProfile } from "../../../network/ApiTypes";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { useHUD } from "../../../context/HUDContext";

import StreamSkeletonList from "../../StreamSkeletonList";
import StreamRowComponent from "../../StreamRowComponent";
import StreamList from "../StreamList";
import ProfileSelector from "../../ProfileSelector";
import { StreamFilterBar } from "../../StreamFilterBar";
import LoadingSpinner from "../../LoadingSpinner";

interface HostCommonComponentsRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

export const HostCommonComponentsRenderer: React.FC<HostCommonComponentsRendererProps> = ({
  schema,
  pluginId,
}) => {
  const hud = useHUD();
  const { type, id, props: componentProps, events } = schema;

  switch (type) {
    case "StreamSkeletonList": {
      return <StreamSkeletonList key={id} />;
    }

    case "StreamRowComponent": {
      const handleStreamClick = () => {
        if (events?.onClick && componentProps.stream) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, componentProps.stream);
        }
      };
      if (!componentProps.stream) return null;
      return (
        <StreamRowComponent
          key={id}
          stream={componentProps.stream}
          onClick={handleStreamClick}
        />
      );
    }

    case "StreamList": {
      const { streams, loading, showFilters, emptyText, nounPlurals } = componentProps;
      const handleSelectStream = (streamPayload: RawStreamPayload) => {
        const selectEvent = events?.onSelectStream;
        if (selectEvent) {
          ExtensionRegistry.triggerUIEvent(pluginId, selectEvent, streamPayload);
        }
      };
      return (
        <StreamList
          key={id}
          streams={streams || []}
          loading={loading}
          showFilters={showFilters}
          emptyText={emptyText}
          onSelectStream={handleSelectStream}
          nounPlurals={nounPlurals as [string, string, string] | undefined}
        />
      );
    }

    case "LoadingSpinner": {
      const { message, fullscreen, height } = componentProps;
      return (
        <LoadingSpinner
          key={id}
          message={message}
          fullscreen={fullscreen}
          height={height !== undefined ? String(height) : undefined}
        />
      );
    }

    case "ProfileSelector": {
      const { connectionProfiles, activeProfileID, isSettingsLocked } = componentProps;
      const handleSelectProfile = (pId: string) => {
        if (events?.onSelectProfile) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onSelectProfile, pId);
        }
      };
      const handleStartEdit = (prof: ConnectionProfile) => {
        if (events?.onStartEdit) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onStartEdit, prof);
        }
      };
      const handleDeleteProfile = (pId: string) => {
        if (events?.onDeleteProfile) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onDeleteProfile, pId);
        }
      };
      const handleStartAdd = () => {
        if (events?.onStartAdd) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onStartAdd, {});
        }
      };
      return (
        <ProfileSelector
          key={id}
          connectionProfiles={connectionProfiles || []}
          activeProfileID={activeProfileID || null}
          isSettingsLocked={isSettingsLocked}
          onSelectProfile={handleSelectProfile}
          onStartEdit={handleStartEdit}
          onDeleteProfile={handleDeleteProfile}
          onStartAdd={handleStartAdd}
          showHUD={hud.show}
        />
      );
    }

    case "StreamFilterBar": {
      const { countLabel, qualityFilter, activeTracker, trackers, showSort, sortOption } = componentProps;
      const handleRefresh = () => {
        if (events?.onRefresh) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onRefresh, {});
        }
      };
      const handleQualityChange = (q: string) => {
        if (events?.onQualityChange) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onQualityChange, q);
        }
      };
      const handleTrackerChange = (t: string) => {
        if (events?.onTrackerChange) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onTrackerChange, t);
        }
      };
      const handleSortChange = (s: string) => {
        if (events?.onSortChange) {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onSortChange, s);
        }
      };
      return (
        <StreamFilterBar
          key={id}
          countLabel={countLabel || ""}
          qualityFilter={qualityFilter || "all"}
          setQualityFilter={handleQualityChange}
          activeTracker={activeTracker || "all"}
          setActiveTracker={handleTrackerChange}
          trackers={trackers || []}
          onRefresh={handleRefresh}
          showSort={showSort}
          sortOption={sortOption}
          setSortOption={handleSortChange}
        />
      );
    }

    default:
      return null;
  }
};

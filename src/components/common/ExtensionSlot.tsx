import React, { useEffect, useState } from "react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import { ErrorBoundary } from "../ErrorBoundary";
import { ComponentRenderer } from "./extension/ComponentRenderer";
import "../../styles/extensions.css";

interface ExtensionSlotProps {
  id?: string;
  contributionId?: string;
  name: string;
  props?: Record<string, unknown>;
}

export const ExtensionSlot: React.FC<ExtensionSlotProps> = ({ id, contributionId, name, props = {} }) => {
  const [, setTick] = useState(0);

  // Force re-render whenever the ExtensionRegistry state updates
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };

    ExtensionRegistry.addListener(handleUpdate);

    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, [name]);

  let contributions = ExtensionRegistry.getSlotContributions(name);
  if (contributionId) {
    contributions = contributions.filter((c) => c.contribution.id === contributionId);
  }
  const contributionIds = contributions.map((c) => c.contribution.id).join(",");

  const lastPropsRef = React.useRef(props);
  const [propsSignal, setPropsSignal] = useState({});

  const shallowEqual = (
    objA: Record<string, unknown> | undefined | null,
    objB: Record<string, unknown> | undefined | null
  ): boolean => {
    if (Object.is(objA, objB)) return true;
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) return false;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!shallowEqual(lastPropsRef.current, props)) {
      lastPropsRef.current = props;
      setPropsSignal({});
    }
  }, [props]);

  // Trigger slot render in sandbox whenever contributions are registered/updated or props change
  useEffect(() => {
    contributions.forEach((c) => {
      ExtensionRegistry.triggerSlotRender(c.contribution.id, props);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributionIds, propsSignal]);

  if (contributions.length === 0) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div id={id} className="potok-extension-slot">
        {contributions.map((c) => {
          const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
          if (!renderResponse || !renderResponse.layout) {
            // Skeleton loader or null while waiting for plugin to process RENDER_SLOT
            return null;
          }
          return (
            <div key={c.contribution.id} className="potok-extension-contribution">
              <ComponentRenderer schema={renderResponse.layout} pluginId={c.pluginId} />
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
};

export default ExtensionSlot;

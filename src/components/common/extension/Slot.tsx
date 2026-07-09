import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { ComponentRenderer } from "./ComponentRenderer";
import { useInspector } from "../../../context/useInspector";
import type { UIComponentSchema } from "@potok/sdk-types";
import { sdkStyleVars } from "./componentRendererUtils";

interface SlotProps {
  name: string;
  props?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  contributionId?: string;
}

// Plugin schema ids are random per compile (SDK base.ts uses Math.random), so React keys derived
// from them change on EVERY plugin re-render → focusable components remount and D-pad focus is lost
// (no navigation on plugin pages). Reassign deterministic, position-based ids so keys stay stable
// across re-renders of the same tree. Mutates in place — the layout is freshly built each render.
function stabilizeSchemaIds(node: unknown, path: string): void {
  if (!node || typeof node !== "object") return;
  const n = node as { id?: string; children?: unknown[] };
  n.id = path;
  if (Array.isArray(n.children)) {
    n.children.forEach((child, i) => stabilizeSchemaIds(child, `${path}.${i}`));
  }
}

function shallowEqual(objA: unknown, objB: unknown): boolean {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  const recordA = objA as Record<string, unknown>;
  const recordB = objB as Record<string, unknown>;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(recordB, key) || !Object.is(recordA[key], recordB[key])) {
      return false;
    }
  }
  return true;
}

export const Slot: React.FC<SlotProps> = ({ name, props = {}, className, style, contributionId }) => {
  const { isInspectorActive, setSelectedSlot } = useInspector();
  const { t } = useTranslation("extensions");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    ExtensionRegistry.addListener(handleUpdate);
    return () => ExtensionRegistry.removeListener(handleUpdate);
  }, []);

  const filteredContributions = useMemo(() => {
    const contributions = ExtensionRegistry.getSlotContributions(name);
    return contributionId
      ? contributions.filter((c) => c.contribution.id === contributionId)
      : contributions;
  // tick: refresh list when contributions are registered/unregistered, not on every render cache update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, contributionId, tick]);

  const contributionKey = useMemo(
    () => filteredContributions.map((c) => c.contribution.id).sort().join(","),
    [filteredContributions],
  );

  const [memoizedProps, setMemoizedProps] = useState(props);
  const isPropsEqual = shallowEqual(memoizedProps, props);
  if (!isPropsEqual) {
    setMemoizedProps(props);
  }

  // Request a fresh layout from the plugin only when slot membership or props change.
  // Do NOT re-request on SLOT_RENDER_RESPONSE cache updates — that caused a render loop.
  useEffect(() => {
    const contribs = ExtensionRegistry.getSlotContributions(name).filter(
      (c) => !contributionId || c.contribution.id === contributionId,
    );
    if (contribs.length === 0) return;
    contribs.forEach((c) => {
      ExtensionRegistry.triggerSlotRender(c.contribution.id, memoizedProps);
    });
  }, [name, contributionId, contributionKey, memoizedProps]);

  const slotStyleVars = style ? sdkStyleVars(style) : undefined;

  if (isInspectorActive) {
    if (filteredContributions.length === 0) {
      return (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedSlot(name);
          }}
          className={`potok-extension-slot-inspector-empty potok-sdk-props ${className || ""}`}
          style={slotStyleVars}
        >
          {t("slot.placeholder", { name })}
        </div>
      );
    }

    return (
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedSlot(name);
        }}
        className={`potok-extension-slot-inspector-active potok-sdk-props ${className || ""}`}
        style={slotStyleVars}
      >
        <div className="potok-extension-slot-inspector-badge">
          {t("slot.active", { name })}
        </div>
        {filteredContributions.map((c) => {
          const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
          if (!renderResponse || !renderResponse.layout) return null;
          return (
            <div key={c.contribution.id} className="potok-extension-slot-contents">
              <ComponentRenderer
                schema={renderResponse.layout as unknown as UIComponentSchema}
                pluginId={c.pluginId}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (filteredContributions.length === 0) return null;

  return (
    <div className={`potok-extension-slot-container potok-sdk-props ${className || ""}`} style={slotStyleVars}>
      {filteredContributions.map((c) => {
        const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
        if (!renderResponse || !renderResponse.layout) return null;
        stabilizeSchemaIds(renderResponse.layout, c.contribution.id);
        return (
          <div key={c.contribution.id} className="potok-extension-slot-contents">
            <ComponentRenderer
              schema={renderResponse.layout as unknown as UIComponentSchema}
              pluginId={c.pluginId}
            />
          </div>
        );
      })}
    </div>
  );
};

export default Slot;
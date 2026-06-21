import React, { useEffect, useState } from "react";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { ComponentRenderer } from "./ComponentRenderer";
import { useInspector } from "../../../context/InspectorContext";
import type { UIComponentSchema } from "@potok/sdk-types";

interface SlotProps {
  name: string;
  props?: any;
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

function shallowEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) return false;
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
}

export const Slot: React.FC<SlotProps> = ({ name, props = {}, className, style, contributionId }) => {
  const { isInspectorActive, setSelectedSlot } = useInspector();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    ExtensionRegistry.addListener(handleUpdate);
    return () => ExtensionRegistry.removeListener(handleUpdate);
  }, []);

  const contributions = ExtensionRegistry.getSlotContributions(name);
  const filteredContributions = contributionId
    ? contributions.filter((c) => c.contribution.id === contributionId)
    : contributions;

  const [memoizedProps, setMemoizedProps] = useState(props);
  const isPropsEqual = shallowEqual(memoizedProps, props);
  if (!isPropsEqual) {
    setMemoizedProps(props);
  }

  useEffect(() => {
    if (filteredContributions.length === 0) return;
    filteredContributions.forEach((c) => {
      ExtensionRegistry.triggerSlotRender(c.contribution.id, props);
    });
  }, [name, filteredContributions.length, memoizedProps]);

  if (isInspectorActive) {
    if (filteredContributions.length === 0) {
      return (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedSlot(name);
          }}
          className={`potok-extension-slot-inspector-empty ${className || ""}`}
          style={{
            border: "1.5px dashed #a855f7",
            padding: "0.625rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(168, 85, 247, 0.05)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
            color: "#a855f7",
            margin: "0.5rem 0",
            width: "100%",
            boxSizing: "border-box",
            ...style
          }}
        >
          [Слот расширения: {name}]
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
        className={`potok-extension-slot-inspector-active ${className || ""}`}
        style={{
          position: "relative",
          border: "2px dashed #a855f7",
          borderRadius: "0.5rem",
          padding: "0.5rem",
          margin: "0.5rem 0",
          cursor: "pointer",
          width: "100%",
          boxSizing: "border-box",
          ...style
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-1.125rem",
            left: "0.25rem",
            background: "#a855f7",
            color: "#fff",
            fontSize: "0.6rem",
            fontWeight: "bold",
            padding: "0.125rem 0.375rem",
            borderRadius: "0.25rem",
            zIndex: 10,
            pointerEvents: "none"
          }}
        >
          Слот: {name} (Активно)
        </div>
        {filteredContributions.map((c) => {
          const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
          if (!renderResponse || !renderResponse.layout) return null;
          return (
            <div key={c.contribution.id} style={{ display: "contents" }}>
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
    <div className={`potok-extension-slot-container ${className || ""}`} style={{ display: "contents", ...style }}>
      {filteredContributions.map((c) => {
        const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
        if (!renderResponse || !renderResponse.layout) return null;
        stabilizeSchemaIds(renderResponse.layout, c.contribution.id);
        return (
          <div key={c.contribution.id} style={{ display: "contents" }}>
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

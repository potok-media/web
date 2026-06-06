import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useLocation } from "react-router-dom";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { ComponentRenderer } from "./ComponentRenderer";
import { useInspector } from "../../../context/InspectorContext";
import type { UIComponentSchema } from "@potok/sdk-types";

// Centralized slot registry mapping slot names to DOM CSS selectors
export const SLOT_SELECTORS: Record<string, string> = {
  "sidebar-menu": "#sidebar-menu-slot",
  "sidebar-menu-home": "#sidebar-menu-home-slot",
  "sidebar-menu-library": "#sidebar-menu-library-slot",
  "sidebar-status": "#sidebar-status-slot",
  "media-actions": "#media-actions-slot",
  "details-bottom": "#details-bottom-slot",
  "settings-color-accent": "#settings-color-accent-slot",
  "settings-tabs": "#settings-tabs-slot",
  "extension-page": "#extension-page-slot",
};

export const GlobalSlotPortalHost: React.FC = () => {
  const { isInspectorActive, setSelectedSlot } = useInspector();
  const location = useLocation();
  const [activeElements, setActiveElements] = useState<Record<string, Element>>({});
  const [, setTick] = useState(0);

  // Re-run scan when registry triggers updates (e.g. plugins registering contributions)
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };
    ExtensionRegistry.addListener(handleUpdate);
    return () => ExtensionRegistry.removeListener(handleUpdate);
  }, []);

  // Monitor DOM for slot element insertions/removals
  useEffect(() => {
    const scanDOM = () => {
      const elementsMap: Record<string, Element> = {};
      Object.entries(SLOT_SELECTORS).forEach(([slotName, selector]) => {
        const el = document.querySelector(selector);
        if (el) {
          elementsMap[slotName] = el;
          
          // Trigger slot render with the element's dynamic props if present
          const propsAttr = el.getAttribute("data-props");
          const props = propsAttr ? JSON.parse(propsAttr) : {};
          const contribIdAttr = el.getAttribute("data-contribution-id");
          const contributions = ExtensionRegistry.getSlotContributions(slotName);
          contributions.forEach((c) => {
            if (!contribIdAttr || c.contribution.id === contribIdAttr) {
              ExtensionRegistry.triggerSlotRender(c.contribution.id, props);
            }
          });
        }
      });

      // Simple equality check to avoid infinite state updates
      const keysA = Object.keys(elementsMap);
      const keysB = Object.keys(activeElements);
      const changed =
        keysA.length !== keysB.length ||
        keysA.some((k) => activeElements[k] !== elementsMap[k]);

      if (changed) {
        setActiveElements(elementsMap);
      }
    };

    scanDOM();

    const observer = new MutationObserver(() => {
      scanDOM();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-props", "data-contribution-id"],
    });

    return () => observer.disconnect();
  }, [activeElements, location.key]);

  return (
    <>
      {Object.entries(activeElements).map(([slotName, element]) => {
        const contributions = ExtensionRegistry.getSlotContributions(slotName);
        const contribIdAttr = element.getAttribute("data-contribution-id");
        const filteredContributions = contribIdAttr
          ? contributions.filter((c) => c.contribution.id === contribIdAttr)
          : contributions;

        if (isInspectorActive) {
          // In Inspector Mode: Render border highlighting and click overlay
          if (filteredContributions.length === 0) {
            // Empty slot placeholder
            return ReactDOM.createPortal(
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedSlot(slotName);
                }}
                style={{
                  border: "1.5px dashed #a855f7",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.05)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: "#a855f7",
                  margin: "8px 0",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                [Слот расширения: {slotName}]
              </div>,
              element
            );
          } else {
            // Populated slot container wrapper
            return ReactDOM.createPortal(
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedSlot(slotName);
                }}
                style={{
                  position: "relative",
                  border: "2px dashed #a855f7",
                  borderRadius: "8px",
                  padding: "8px",
                  margin: "8px 0",
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-18px",
                    left: "4px",
                    background: "#a855f7",
                    color: "#fff",
                    fontSize: "0.6rem",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    zIndex: 10,
                    pointerEvents: "none"
                  }}
                >
                  Слот: {slotName} (Активно)
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
              </div>,
              element
            );
          }
        } else {
          // Regular Mode: Render active contributions normally without wrapper borders
          if (filteredContributions.length === 0) return null;
          return ReactDOM.createPortal(
            <div style={{ display: "contents" }}>
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
            </div>,
            element
          );
        }
      })}
    </>
  );
};

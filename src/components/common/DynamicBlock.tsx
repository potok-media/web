import React, { useEffect, useState } from "react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { UIComponentSchema, RawStreamPayload } from "../../network/SDKTypes";
import { ErrorBoundary } from "../ErrorBoundary";
import { ChevronDown, Check } from "lucide-react";
import StreamSkeletonList from "../StreamSkeletonList";
import StreamRowComponent from "../StreamRowComponent";
import StreamList from "./StreamList";
import "../../styles/extensions.css";

// Global click-timestamp registry to throttle custom element clicks to 1 per 400ms
const globalClickTimestamps = new Map<string, number>();

const debounceClick = (pluginId: string, callback: () => void) => {
  const now = Date.now();
  const lastClick = globalClickTimestamps.get(pluginId) || 0;
  if (now - lastClick >= 400) {
    globalClickTimestamps.set(pluginId, now);
    callback();
  } else {
    console.warn(`[DynamicBlock] Click on plugin ${pluginId} throttled (400ms debounce active).`);
  }
};

// Safe Input to maintain local state synchronously and prevent locking
const SafeInput: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localValue, setLocalValue] = useState(componentProps.value || "");

  useEffect(() => {
    setLocalValue(componentProps.value || "");
  }, [componentProps.value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  return (
    <div key={id} className="potok-input-group" style={baseStyle}>
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <input
        className="potok-input"
        type={componentProps.inputType || "text"}
        placeholder={componentProps.placeholder}
        value={localValue}
        disabled={componentProps.disabled}
        onChange={handleInputChange}
      />
    </div>
  );
};

// Safe Toggle
const SafeToggle: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localChecked, setLocalChecked] = useState(!!componentProps.checked);

  useEffect(() => {
    setLocalChecked(!!componentProps.checked);
  }, [componentProps.checked]);

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLocalChecked(checked);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, checked);
    }
  };

  return (
    <label key={id} className="potok-toggle-group" style={baseStyle}>
      <div className="potok-toggle-label-wrap">
        <span className="potok-label">{componentProps.label}</span>
        {componentProps.description && <span className="potok-toggle-desc">{componentProps.description}</span>}
      </div>
      <div className="potok-switch">
        <input
          type="checkbox"
          checked={localChecked}
          disabled={componentProps.disabled}
          onChange={handleToggleChange}
        />
        <span className="potok-slider" />
      </div>
    </label>
  );
};

// Safe Select with premium customs
const SafeSelect: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localSelected, setLocalSelected] = useState(componentProps.selected || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setLocalSelected(componentProps.selected || "");
  }, [componentProps.selected]);

  const handleSelectOption = (val: string) => {
    setLocalSelected(val);
    setIsOpen(false);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  const selectedOption = componentProps.options?.find((opt: any) => opt.value === localSelected) 
    || componentProps.options?.[0];

  return (
    <div key={id} className="potok-input-group filter-popover-wrapper" style={{ ...baseStyle, position: "relative" }}>
      {componentProps.label && <label className="potok-label" style={{ marginBottom: "6px" }}>{componentProps.label}</label>}
      <button
        type="button"
        className="btn-glass filter-btn-trigger"
        style={{ 
          width: "100%", 
          justifyContent: "space-between", 
          padding: "10px 18px", 
          borderRadius: "12px",
          font: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          border: "var(--glass-border)",
          background: "var(--bg-surface-high)"
        }}
        disabled={componentProps.disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : "Выбрать..."}</span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>

      {isOpen && (
        <>
          <div 
            className="filter-popover-overlay" 
            style={{ position: "fixed", inset: 0, zIndex: 90 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className="filter-popover" 
            style={{ 
              position: "absolute", 
              top: "100%", 
              left: 0, 
              zIndex: 100, 
              minWidth: "200px", 
              marginTop: "6px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.15s ease-out"
            }}
          >
            {componentProps.options?.map((opt: any) => (
              <div
                key={opt.value}
                className={`popover-item ${localSelected === opt.value ? "active" : ""}`}
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "10px 16px", 
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  color: localSelected === opt.value ? "var(--text-primary)" : "var(--text-secondary)"
                }}
                onClick={() => handleSelectOption(opt.value)}
              >
                <span>{opt.label}</span>
                {localSelected === opt.value && <Check size={14} className="filter-popover-check" />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface DynamicBlockProps {
  name: string;
  contextProps?: any;
  children: React.ReactNode;
  skeletonHeight?: number;
}

export const DynamicBlock: React.FC<DynamicBlockProps> = ({
  name,
  contextProps,
  children,
  skeletonHeight = 50
}) => {
  const [settlementState, setSettlementState] = useState(ExtensionRegistry.settlementState);
  const [, setTick] = useState(0);

  // Broadcast contextProps to extensions
  useEffect(() => {
    if (contextProps) {
      ExtensionRegistry.broadcastBlockContext(name, contextProps);
    }
  }, [name, contextProps]);

  // Force re-render and settlement state synchronization whenever the ExtensionRegistry state updates
  useEffect(() => {
    const handleUpdate = () => {
      setSettlementState(ExtensionRegistry.settlementState);
      setTick((t) => t + 1);
      if (contextProps) {
        ExtensionRegistry.broadcastBlockContext(name, contextProps);
      }
    };

    ExtensionRegistry.addListener(handleUpdate);

    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, [name, contextProps]);

  // Render Component defined by schema (with key override support for deterministic React keys)
  const renderComponent = (
    schema: UIComponentSchema, 
    pluginId: string, 
    overrideKey?: string
  ): React.ReactNode => {
    if (!schema || !schema.type) return null;
    const { type, id, props: componentProps, children: subChildren, events } = schema;

    const baseStyle: React.CSSProperties = {};
    if (componentProps.width !== undefined) baseStyle.width = componentProps.width;
    if (componentProps.height !== undefined) baseStyle.height = componentProps.height;
    if (componentProps.flex !== undefined) baseStyle.flex = componentProps.flex;
    if (componentProps.visible === false) return null;

    const keyToUse = overrideKey || id;

    const handleClick = () => {
      if (events?.onClick) {
        debounceClick(pluginId, () => {
          ExtensionRegistry.triggerUIEvent(pluginId, events.onClick!, {});
        });
      }
    };

    switch (type) {
      case "VStack": {
        const inlineStyle: React.CSSProperties = {
          ...baseStyle,
          gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
          alignItems: componentProps.alignItems,
          justifyContent: componentProps.justifyContent === "start" ? "flex-start" 
            : componentProps.justifyContent === "end" ? "flex-end"
            : componentProps.justifyContent === "between" ? "space-between"
            : componentProps.justifyContent === "around" ? "space-around"
            : componentProps.justifyContent,
        };
        return (
          <div key={keyToUse} className="potok-vstack" style={inlineStyle}>
            {subChildren?.map((child) => renderComponent(child, pluginId))}
          </div>
        );
      }

      case "HStack": {
        const inlineStyle: React.CSSProperties = {
          ...baseStyle,
          gap: componentProps.spacing !== undefined ? `${componentProps.spacing}px` : undefined,
          alignItems: componentProps.alignItems,
          justifyContent: componentProps.justifyContent === "start" ? "flex-start" 
            : componentProps.justifyContent === "end" ? "flex-end"
            : componentProps.justifyContent === "between" ? "space-between"
            : componentProps.justifyContent === "around" ? "space-around"
            : componentProps.justifyContent,
        };
        return (
          <div key={keyToUse} className="potok-hstack" style={inlineStyle}>
            {subChildren?.map((child) => renderComponent(child, pluginId))}
          </div>
        );
      }

      case "Card": {
        return (
          <div key={keyToUse} className="potok-card" style={baseStyle}>
            {(componentProps.title || componentProps.subtitle) && (
              <div className="potok-card-header">
                {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
                {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
              </div>
            )}
            <div className="potok-card-body">
              {subChildren?.map((child) => renderComponent(child, pluginId))}
            </div>
          </div>
        );
      }

      case "Heading": {
        const Level = `h${componentProps.level || 1}` as "h1" | "h2" | "h3" | "h4";
        return (
          <Level key={keyToUse} className={`potok-heading potok-heading-${componentProps.level || 1}`} style={baseStyle}>
            {componentProps.text}
          </Level>
        );
      }

      case "Text": {
        const textClass = `potok-text potok-text-${componentProps.variant || "primary"} potok-text-${componentProps.size || "md"} ${
          componentProps.bold ? "potok-text-bold" : ""
        }`;
        return (
          <span key={keyToUse} className={textClass} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Badge": {
        return (
          <span key={keyToUse} className={`potok-badge potok-badge-${componentProps.color || "info"}`} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Divider": {
        return <hr key={keyToUse} className="potok-divider" style={baseStyle} />;
      }

      case "Spacer": {
        return <div key={keyToUse} className="potok-spacer" style={{ ...baseStyle, flexGrow: 1 }} />;
      }

      case "Button": {
        const btnClass = `potok-btn potok-btn-${componentProps.variant || "secondary"}`;
        return (
          <button key={keyToUse} className={btnClass} disabled={componentProps.disabled} onClick={handleClick} style={baseStyle}>
            {componentProps.text}
          </button>
        );
      }

      case "Input": {
        return <SafeInput key={keyToUse} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Toggle": {
        return <SafeToggle key={keyToUse} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Select": {
        return <SafeSelect key={keyToUse} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "StreamSkeletonList": {
        return <StreamSkeletonList key={keyToUse} />;
      }

      case "StreamRowComponent": {
        const handleStreamClick = () => {
          if (events?.onClick) {
            debounceClick(pluginId, () => {
              ExtensionRegistry.triggerUIEvent(pluginId, events.onClick!, componentProps.stream);
            });
          }
        };
        return (
          <StreamRowComponent
            key={keyToUse}
            stream={componentProps.stream}
            onClick={handleStreamClick}
          />
        );
      }

      case "StreamList": {
        const handleSelectStream = (stream: RawStreamPayload) => {
          if (events?.onSelectStream) {
            debounceClick(pluginId, () => {
              ExtensionRegistry.triggerUIEvent(pluginId, events.onSelectStream!, stream);
            });
          }
        };
        return (
          <StreamList
            key={keyToUse}
            streams={componentProps.streams || []}
            loading={componentProps.loading}
            showFilters={componentProps.showFilters}
            emptyText={componentProps.emptyText}
            onSelectStream={handleSelectStream}
            nounPlurals={componentProps.nounPlurals as [string, string, string] | undefined}
          />
        );
      }

      default:
        return null;
    }
  };

  // If settling, show our beautiful high-fidelity pulse placeholder
  if (settlementState === "settling") {
    return (
      <div 
        className="potok-shimmer-placeholder" 
        style={{ 
          height: `${skeletonHeight}px`, 
          width: "100%", 
          borderRadius: "12px" 
        }} 
      />
    );
  }

  // 1. Flatten children and map them to standard { id, element } shape
  const childArray = React.Children.toArray(children);
  let elements: { id: string; element: React.ReactNode }[] = [];
  childArray.forEach((child, index) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    let elementId = `child-${index}`;
    if (React.isValidElement(child) && child.props && (child.props as any).id) {
      elementId = (child.props as any).id;
    }
    elements.push({ id: elementId, element: child });
  });

  // 2. Fetch block mutations from the registry
  let blockMutations = ExtensionRegistry.getBlockMutations(name);

  // Host-level Tab Isolation: Only allow plugin layout mutations that match the active tab (which is the pluginId)
  if (name.startsWith("media-streams-") && contextProps?.tab) {
    const activeTab = String(contextProps.tab).toLowerCase();
    blockMutations = blockMutations.filter(({ pluginId }) => {
      return pluginId.toLowerCase() === activeTab;
    });
  }

  if (name === "media-streams-results") {
    console.log("[DynamicBlock] media-streams-results render. blockMutations:", blockMutations, "settlementState:", settlementState);
  }

  // 3. Apply mutations (PREPEND, APPEND, HIDE, EDIT, INSERT_BEFORE, INSERT_AFTER, REPLACE)
  blockMutations.forEach(({ pluginId, mutations, appends, prepends }) => {
    // A. Apply Prepends
    prepends.forEach((prependSchema, index) => {
      const stableKey = `ext-mut:${pluginId}:${name}:prepend:direct:${index}`;
      const rendered = renderComponent(prependSchema, pluginId, stableKey);
      if (rendered !== null) {
        elements.unshift({ id: stableKey, element: rendered });
      }
    });

    // B. Apply Appends
    appends.forEach((appendSchema, index) => {
      const stableKey = `ext-mut:${pluginId}:${name}:append:direct:${index}`;
      const rendered = renderComponent(appendSchema, pluginId, stableKey);
      if (rendered !== null) {
        elements.push({ id: stableKey, element: rendered });
      }
    });

    // C. Apply element mutations
    mutations.forEach((mutation, index) => {
      const targetId = mutation.elementId;
      const action = mutation.action;

      if (action === "hide") {
        // HIDE action
        elements = elements.filter((el) => el.id !== targetId);
      } else if (action === "edit") {
        // EDIT action (clone element with custom props)
        elements = elements.map((el) => {
          if (el.id === targetId && React.isValidElement(el.element)) {
            return {
              ...el,
              element: React.cloneElement(el.element, {
                ...(el.element.props as any),
                ...(mutation.props || {}),
              }),
            };
          }
          return el;
        });
      } else if (action === "before" && mutation.layout) {
        // INSERT_BEFORE action
        const stableKey = `ext-mut:${pluginId}:${name}:before:${targetId}:${index}`;
        const rendered = renderComponent(mutation.layout, pluginId, stableKey);
        if (rendered !== null) {
          const targetIndex = elements.findIndex((el) => el.id === targetId);
          if (targetIndex !== -1) {
            elements.splice(targetIndex, 0, { id: stableKey, element: rendered });
          }
        }
      } else if (action === "after" && mutation.layout) {
        // INSERT_AFTER action
        const stableKey = `ext-mut:${pluginId}:${name}:after:${targetId}:${index}`;
        const rendered = renderComponent(mutation.layout, pluginId, stableKey);
        if (rendered !== null) {
          const targetIndex = elements.findIndex((el) => el.id === targetId);
          if (targetIndex !== -1) {
            elements.splice(targetIndex + 1, 0, { id: stableKey, element: rendered });
          }
        }
      } else if (action === "replace" && mutation.layout) {
        // REPLACE action
        const stableKey = `ext-mut:${pluginId}:${name}:replace:${targetId}:${index}`;
        const rendered = renderComponent(mutation.layout, pluginId, stableKey);
        if (rendered !== null) {
          const targetIndex = elements.findIndex((el) => el.id === targetId);
          if (targetIndex !== -1) {
            elements[targetIndex] = { id: stableKey, element: rendered };
          }
        }
      }
    });
  });

  return (
    <ErrorBoundary>
      <React.Fragment>
        {elements.map((el) => {
          // If the element has a key defined or is valid element, make sure it renders beautifully
          if (React.isValidElement(el.element)) {
            // We can clone with key to guarantee stable React tracking key
            return React.cloneElement(el.element, { key: el.id });
          }
          return <React.Fragment key={el.id}>{el.element}</React.Fragment>;
        })}
      </React.Fragment>
    </ErrorBoundary>
  );
};

export default DynamicBlock;

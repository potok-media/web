import React, { useEffect, useState } from "react";
import { ExtensionRegistry } from "../../utils/extensions/ExtensionRegistry";
import type { UIComponentSchema } from "../../network/SDKTypes";
import { ErrorBoundary } from "../ErrorBoundary";
import "../../styles/extensions.css";

interface ExtensionSlotProps {
  name: string;
  props?: any;
}

// 1. SafeInput component to maintain local state synchronously and prevent React input locking
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
    setLocalValue(val); // Update local state synchronously for smooth 120fps typing
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

// 2. SafeToggle component to maintain local checked state synchronously
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

// 3. SafeSelect component to maintain local selection state
const SafeSelect: React.FC<{
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}> = ({ schema, pluginId, baseStyle }) => {
  const { id, props: componentProps, events } = schema;
  const [localSelected, setLocalSelected] = useState(componentProps.selected || "");

  useEffect(() => {
    setLocalSelected(componentProps.selected || "");
  }, [componentProps.selected]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLocalSelected(val);
    if (events?.onChange) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onChange, val);
    }
  };

  return (
    <div key={id} className="potok-input-group" style={baseStyle}>
      {componentProps.label && <label className="potok-label">{componentProps.label}</label>}
      <select
        className="potok-select"
        value={localSelected}
        disabled={componentProps.disabled}
        onChange={handleSelectChange}
      >
        {componentProps.options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const ExtensionSlot: React.FC<ExtensionSlotProps> = ({ name, props = {} }) => {
  const [, setTick] = useState(0);

  // Force re-render whenever the ExtensionRegistry state updates
  useEffect(() => {
    const handleUpdate = () => {
      setTick((t) => t + 1);
    };

    ExtensionRegistry.addListener(handleUpdate);

    // Dynamic slot triggers - ask all extensions contributing to this slot to render initially
    const contributions = ExtensionRegistry.getSlotContributions(name);
    contributions.forEach((c) => {
      ExtensionRegistry.triggerSlotRender(c.contribution.id, props);
    });

    return () => {
      ExtensionRegistry.removeListener(handleUpdate);
    };
  }, [name, JSON.stringify(props)]);

  const contributions = ExtensionRegistry.getSlotContributions(name);

  if (contributions.length === 0) {
    return null;
  }

  // Recursive renderer for arbitrary dynamic UI schemas
  const renderComponent = (schema: UIComponentSchema, pluginId: string): React.ReactNode => {
    if (!schema || !schema.type) return null;
    const { type, id, props: componentProps, children, events } = schema;

    const baseStyle: React.CSSProperties = {};
    if (componentProps.width !== undefined) baseStyle.width = componentProps.width;
    if (componentProps.height !== undefined) baseStyle.height = componentProps.height;
    if (componentProps.flex !== undefined) baseStyle.flex = componentProps.flex;
    if (componentProps.visible === false) return null;

    const handleClick = () => {
      if (events?.onClick) {
        ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, {});
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
          <div key={id} className="potok-vstack" style={inlineStyle}>
            {children?.map((child) => renderComponent(child, pluginId))}
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
          <div key={id} className="potok-hstack" style={inlineStyle}>
            {children?.map((child) => renderComponent(child, pluginId))}
          </div>
        );
      }

      case "Card": {
        return (
          <div key={id} className="potok-card" style={baseStyle}>
            {(componentProps.title || componentProps.subtitle) && (
              <div className="potok-card-header">
                {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
                {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
              </div>
            )}
            <div className="potok-card-body">
              {children?.map((child) => renderComponent(child, pluginId))}
            </div>
          </div>
        );
      }

      case "Heading": {
        const Level = `h${componentProps.level || 1}` as "h1" | "h2" | "h3" | "h4";
        return (
          <Level key={id} className={`potok-heading potok-heading-${componentProps.level || 1}`} style={baseStyle}>
            {componentProps.text}
          </Level>
        );
      }

      case "Text": {
        const textClass = `potok-text potok-text-${componentProps.variant || "primary"} potok-text-${componentProps.size || "md"} ${
          componentProps.bold ? "potok-text-bold" : ""
        }`;
        return (
          <span key={id} className={textClass} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Badge": {
        return (
          <span key={id} className={`potok-badge potok-badge-${componentProps.color || "info"}`} style={baseStyle}>
            {componentProps.text}
          </span>
        );
      }

      case "Divider": {
        return <hr key={id} className="potok-divider" style={baseStyle} />;
      }

      case "Spacer": {
        return <div key={id} className="potok-spacer" style={{ ...baseStyle, flexGrow: 1 }} />;
      }

      case "Button": {
        const btnClass = `potok-btn potok-btn-${componentProps.variant || "secondary"}`;
        return (
          <button key={id} className={btnClass} disabled={componentProps.disabled} onClick={handleClick} style={baseStyle}>
            {componentProps.text}
          </button>
        );
      }

      case "Input": {
        return <SafeInput key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Toggle": {
        return <SafeToggle key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      case "Select": {
        return <SafeSelect key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
      }

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="potok-extension-slot">
        {contributions.map((c) => {
          const renderResponse = ExtensionRegistry.getSlotRender(c.contribution.id);
          if (!renderResponse || !renderResponse.layout) {
            // Skeleton loader or null while waiting for plugin to process RENDER_SLOT
            return null;
          }
          return (
            <div key={c.contribution.id} className="potok-extension-contribution">
              {renderComponent(renderResponse.layout, c.pluginId)}
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
};
export default ExtensionSlot;

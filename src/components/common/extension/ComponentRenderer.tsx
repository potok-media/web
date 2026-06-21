import React from "react";
import { useLocation } from "react-router-dom";
import * as Lucide from "lucide-react";
import type { UIComponentSchema } from "@potok/sdk-types";
import { Focusable } from "../TVNavigation";
import "../../../styles/extensions.css";

// Import modular components
import { SafeInput } from "./SafeInput";
import { SafeToggle } from "./SafeToggle";
import { SafeSelect } from "./SafeSelect";
import { SafeSearchBar } from "./SafeSearchBar";
import { SafeMarkdown } from "./SafeMarkdown";
import { SafeCodeEditor } from "./SafeCodeEditor";
import { HostMediaComponentsRenderer } from "./HostMediaComponentsRenderer";
import { HostCommonComponentsRenderer } from "./HostCommonComponentsRenderer";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import { Grid } from "../Grid";
import { logger } from "../../../utils/logger";

const formatSpacingValue = (val: any): string | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number") return `${val}px`;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "number" ? `${v}px` : v)).join(" ");
  }
  return undefined;
};

const toPascalCase = (str: string): string => {
  if (!str) return "";
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

interface ComponentRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
}

const HOST_MEDIA_TYPES = new Set([
  "MediaCard",
  "HeroSpotlight",
  "EpisodesSection",
  "SeasonEpisodes",
  "MediaCast",
  "MediaOverview",
  "MediaRow",
  "MediaPlayer",
  "EpisodeSelector",
  "EpisodeSelectorPopup",
  "EpisodeCard"
]);

const HOST_COMMON_TYPES = new Set([
  "StreamSkeletonList",
  "StreamRow",
  "StreamRowComponent",
  "StreamList",
  "LoadingSpinner",
  "ProfileSelector",
  "StreamFilterBar"
]);

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ schema, pluginId }) => {
  if (!schema || !schema.type) return null;
  const { type, id, children, events } = schema;

  const normalizedType =
    type === "StreamRowComponent" ? "StreamRow" :
    type === "EpisodeSelectorPopup" ? "EpisodeSelector" :
    type === "SeasonEpisodes" ? "EpisodesSection" :
    type;

  const normalizedSchema = {
    ...schema,
    type: normalizedType
  } as any;

  const baseStyle: React.CSSProperties = {};
  if (schema.props.width !== undefined) baseStyle.width = schema.props.width;
  if (schema.props.height !== undefined) baseStyle.height = schema.props.height;
  if (schema.props.flex !== undefined) baseStyle.flex = schema.props.flex;
  if (schema.props.padding !== undefined) {
    baseStyle.padding = formatSpacingValue(schema.props.padding);
  }
  if (schema.props.margin !== undefined) {
    baseStyle.margin = formatSpacingValue(schema.props.margin);
  }
  if (schema.props.visible === false) return null;

  if (HOST_MEDIA_TYPES.has(normalizedType)) {
    return <HostMediaComponentsRenderer schema={normalizedSchema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  if (HOST_COMMON_TYPES.has(normalizedType)) {
    return <HostCommonComponentsRenderer schema={normalizedSchema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  const handleClick = () => {
    if (events?.onClick) {
      ExtensionRegistry.triggerUIEvent(pluginId, events.onClick, {});
    }
  };

  switch (schema.type) {
    case "VStack": {
      const componentProps = schema.props;
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
        <div key={id} id={id} className="potok-vstack" style={inlineStyle}>
          {children?.map((child, index) => (
            // Stable position-based key: plugin schema ids are random per compile (base.ts), so
            // keying by child.id would remount every focusable on each plugin re-render and drop
            // D-pad focus. Tree position is stable for a given state.
            <ComponentRenderer key={`${index}-${child.type}`} schema={child} pluginId={pluginId} />
          ))}
        </div>
      );
    }

    case "HStack": {
      const componentProps = schema.props;
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
        <div key={id} id={id} className="potok-hstack" style={inlineStyle}>
          {children?.map((child, index) => (
            // Stable position-based key: plugin schema ids are random per compile (base.ts), so
            // keying by child.id would remount every focusable on each plugin re-render and drop
            // D-pad focus. Tree position is stable for a given state.
            <ComponentRenderer key={`${index}-${child.type}`} schema={child} pluginId={pluginId} />
          ))}
        </div>
      );
    }

    case "Grid": {
      const componentProps = schema.props;
      return (
        <Grid
          key={id}
          minWidth={componentProps.minWidth || "11.25rem"}
          gap={componentProps.gap}
          style={baseStyle}
        >
          {children?.map((child, index) => (
            // Stable position-based key: plugin schema ids are random per compile (base.ts), so
            // keying by child.id would remount every focusable on each plugin re-render and drop
            // D-pad focus. Tree position is stable for a given state.
            <ComponentRenderer key={`${index}-${child.type}`} schema={child} pluginId={pluginId} />
          ))}
        </Grid>
      );
    }

    case "Card": {
      const componentProps = schema.props;
      const isInteractive = !!events?.onClick;
      const cardClass = `potok-card ${isInteractive ? "potok-card-interactive" : ""}`;
      
      const renderCardBody = (ref: any, focused: boolean) => (
        <div
          ref={ref}
          key={id}
          id={id}
          className={`${cardClass} ${focused ? "focused" : ""}`}
          style={baseStyle}
          onClick={isInteractive ? handleClick : undefined}
        >
          {(componentProps.title || componentProps.subtitle) && (
            <div className="potok-card-header">
              {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
              {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
            </div>
          )}
          <div className="potok-card-body">
            {children?.map((child, index) => (
              <ComponentRenderer key={`${index}-${child.type}`} schema={child} pluginId={pluginId} />
            ))}
          </div>
        </div>
      );

      if (isInteractive) {
        return (
          <Focusable key={id} onEnterPress={handleClick}>
            {({ ref, focused }) => renderCardBody(ref, focused)}
          </Focusable>
        );
      }

      return renderCardBody(null, false);
    }

    case "Markdown": {
      const componentProps = schema.props;
      return (
        <SafeMarkdown
          key={id}
          content={componentProps.content || ""}
        />
      );
    }

    case "Heading": {
      const componentProps = schema.props;
      const Level = `h${componentProps.level || 1}` as "h1" | "h2" | "h3" | "h4";
      return (
        <Level key={id} className={`potok-heading potok-heading-${componentProps.level || 1}`} style={baseStyle}>
          {componentProps.text}
        </Level>
      );
    }

    case "Text": {
      const componentProps = schema.props;
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
      const componentProps = schema.props;
      return (
        <span key={id} className={`potok-badge potok-badge-${componentProps.color || "info"}`} style={baseStyle}>
          {componentProps.text}
        </span>
      );
    }

    case "StatusRow": {
      const componentProps = schema.props;
      const rawStatus = componentProps.status || "offline";
      const statusClass = rawStatus === "success" ? "online" : rawStatus;
      return (
        <div key={id} id={id} className="sidebar-status-row" style={baseStyle}>
          <span className={`sidebar-status-dot ${statusClass}`} />
          <span className="sidebar-status-label">{componentProps.label}</span>
          {componentProps.value && (
            <span className="sidebar-status-latency">{componentProps.value}</span>
          )}
        </div>
      );
    }

    case "Divider": {
      return <hr key={id} className="potok-divider" style={baseStyle} />;
    }

    case "Spacer": {
      return <div key={id} className="potok-spacer" style={{ ...baseStyle, flexGrow: 1 }} />;
    }

    case "Button": {
      const componentProps = schema.props;
      const variant = componentProps.variant || "secondary";
      const isSidebarItem = variant === "sidebar-item";
      
      const location = useLocation();
      const isActive = isSidebarItem && location.pathname.toLowerCase() === `/extensions/${pluginId.toLowerCase()}`;

      const btnClass = isSidebarItem
        ? `sidebar-nav-item ${isActive ? "active" : ""}`
        : `potok-btn potok-btn-${variant} ${variant.startsWith("btn-") ? variant : `btn-${variant}`}`;
      
      let buttonText = componentProps.text || "";
      if (isSidebarItem && buttonText.length > 20) {
        buttonText = buttonText.substring(0, 17) + "...";
      }

      let IconComponent = null;
      const iconName = componentProps.icon;
      if (iconName) {
        const pascalName = toPascalCase(iconName);
        const DynamIcon = (Lucide as any)[pascalName] || (Lucide as any)[iconName];
        if (DynamIcon) {
          IconComponent = <DynamIcon size="1.125rem" />;
        } else {
          const iconUrl = `/assets/icons/${iconName}.svg`;
          IconComponent = (
            <span
              style={{
                display: "inline-block",
                width: "1.125rem",
                height: "1.125rem",
                backgroundColor: "currentColor",
                maskImage: `url(${iconUrl})`,
                WebkitMaskImage: `url(${iconUrl})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
                flexShrink: 0
              }}
            />
          );
        }
      }

      const debugClick = () => {
        logger.log("[ComponentRenderer] Button Clicked!", {
          text: componentProps.text,
          pluginId,
          events: schema.events,
          schema
        });
        if (schema.events?.onClick) {
          logger.log("[ComponentRenderer] Dispatching onClick:", schema.events.onClick);
          ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onClick, {});
        } else {
          logger.warn("[ComponentRenderer] No onClick event registered in events schema!");
        }
      };

      return (
        <Focusable
          key={id}
          disabled={componentProps.disabled}
          onEnterPress={debugClick}
        >
          {({ ref, focused }) => (
            <button
              ref={ref}
              className={`${btnClass} ${focused ? "focused" : ""}`}
              disabled={componentProps.disabled}
              onClick={debugClick}
              style={baseStyle}
            >
              {IconComponent}
              <span>{buttonText}</span>
            </button>
          )}
        </Focusable>
      );
    }

    case "Input": {
      return <SafeInput key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    case "CodeEditor": {
      return <SafeCodeEditor key={id} schema={schema as any} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    case "Toggle": {
      return <SafeToggle key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    case "Select": {
      return <SafeSelect key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    case "SearchBar": {
      return <SafeSearchBar key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    default:
      return null;
  }
};
export default ComponentRenderer;

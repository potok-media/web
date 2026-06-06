import React from "react";
import { useLocation } from "react-router-dom";
import { Puzzle, Terminal, Sliders, Play, Bookmark, Star, Clock, Home, User, Settings } from "lucide-react";
import type { UIComponentSchema } from "@potok/sdk-types";
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
          {children?.map((child) => (
            <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
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
          {children?.map((child) => (
            <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
          ))}
        </div>
      );
    }

    case "Grid": {
      const componentProps = schema.props;
      return (
        <Grid
          key={id}
          minWidth={componentProps.minWidth || "180px"}
          gap={componentProps.gap}
          style={baseStyle}
        >
          {children?.map((child) => (
            <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
          ))}
        </Grid>
      );
    }

    case "Card": {
      const componentProps = schema.props;
      const isInteractive = !!events?.onClick;
      const cardClass = `potok-card ${isInteractive ? "potok-card-interactive" : ""}`;
      return (
        <div key={id} id={id} className={cardClass} style={baseStyle} onClick={isInteractive ? handleClick : undefined}>
          {(componentProps.title || componentProps.subtitle) && (
            <div className="potok-card-header">
              {componentProps.title && <h3 className="potok-card-title">{componentProps.title}</h3>}
              {componentProps.subtitle && <p className="potok-card-subtitle">{componentProps.subtitle}</p>}
            </div>
          )}
          <div className="potok-card-body">
            {children?.map((child) => (
              <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
            ))}
          </div>
        </div>
      );
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
        ? `potok-btn-sidebar-item ${isActive ? "active" : ""}`
        : `potok-btn potok-btn-${variant} ${variant.startsWith("btn-") ? variant : `btn-${variant}`}`;
      
      let IconComponent = null;
      const iconName = componentProps.icon;
      if (iconName) {
        switch (iconName) {
          case "puzzle": IconComponent = <Puzzle size={18} />; break;
          case "terminal": IconComponent = <Terminal size={18} />; break;
          case "sliders": IconComponent = <Sliders size={18} />; break;
          case "play": IconComponent = <Play size={18} />; break;
          case "bookmark": IconComponent = <Bookmark size={18} />; break;
          case "star": IconComponent = <Star size={18} />; break;
          case "clock": IconComponent = <Clock size={18} />; break;
          case "home": IconComponent = <Home size={18} />; break;
          case "user": IconComponent = <User size={18} />; break;
          case "settings": IconComponent = <Settings size={18} />; break;
          default: {
            const iconUrl = `/assets/icons/${iconName}.svg`;
            IconComponent = (
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
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
            break;
          }
        }
      }

      const debugClick = () => {
        console.log("[ComponentRenderer] Button Clicked!", {
          text: componentProps.text,
          pluginId,
          events: schema.events,
          schema
        });
        if (schema.events?.onClick) {
          console.log("[ComponentRenderer] Dispatching onClick:", schema.events.onClick);
          ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onClick, {});
        } else {
          console.warn("[ComponentRenderer] No onClick event registered in events schema!");
        }
      };

      return (
        <button key={id} className={btnClass} disabled={componentProps.disabled} onClick={debugClick} style={baseStyle}>
          {IconComponent}
          <span>{componentProps.text}</span>
        </button>
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

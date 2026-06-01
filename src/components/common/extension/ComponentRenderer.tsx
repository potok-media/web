import React from "react";
import { useLocation } from "react-router-dom";
import { Puzzle, Terminal, Sliders, Play, Bookmark, Star, Clock, Home, User, Settings } from "lucide-react";
import type { UIComponentSchema } from "../../../network/SDKTypes";

// Import modular components
import { SafeInput } from "./SafeInput";
import { SafeToggle } from "./SafeToggle";
import { SafeSelect } from "./SafeSelect";
import { SafeSearchBar } from "./SafeSearchBar";
import { SafeMarkdown } from "./SafeMarkdown";
import { HostMediaComponentsRenderer } from "./HostMediaComponentsRenderer";
import { HostCommonComponentsRenderer } from "./HostCommonComponentsRenderer";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";

interface ComponentRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
}

const HOST_MEDIA_TYPES = new Set([
  "MediaCard",
  "HeroSpotlight",
  "SeasonEpisodes",
  "MediaCast",
  "MediaOverview",
  "MediaRow",
  "MediaPlayer",
  "EpisodeSelectorPopup"
]);

const HOST_COMMON_TYPES = new Set([
  "StreamSkeletonList",
  "StreamRowComponent",
  "StreamList",
  "LoadingSpinner",
  "ProfileSelector",
  "StreamFilterBar"
]);

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ schema, pluginId }) => {
  if (!schema || !schema.type) return null;
  const { type, id, props: componentProps, children, events } = schema;

  const baseStyle: React.CSSProperties = {};
  if (componentProps.width !== undefined) baseStyle.width = componentProps.width;
  if (componentProps.height !== undefined) baseStyle.height = componentProps.height;
  if (componentProps.flex !== undefined) baseStyle.flex = componentProps.flex;
  if (componentProps.visible === false) return null;

  if (HOST_MEDIA_TYPES.has(type)) {
    return <HostMediaComponentsRenderer schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  if (HOST_COMMON_TYPES.has(type)) {
    return <HostCommonComponentsRenderer schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

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
          {children?.map((child) => (
            <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
          ))}
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
          {children?.map((child) => (
            <ComponentRenderer key={child.id} schema={child} pluginId={pluginId} />
          ))}
        </div>
      );
    }

    case "Card": {
      const isInteractive = !!events?.onClick;
      const cardClass = `potok-card ${isInteractive ? "potok-card-interactive" : ""}`;
      return (
        <div key={id} className={cardClass} style={baseStyle} onClick={isInteractive ? handleClick : undefined}>
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
      return (
        <SafeMarkdown
          key={id}
          content={componentProps.content || ""}
        />
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
        }
      }

      return (
        <button key={id} className={btnClass} disabled={componentProps.disabled} onClick={handleClick} style={baseStyle}>
          {IconComponent}
          <span>{componentProps.text}</span>
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

    case "SearchBar": {
      return <SafeSearchBar key={id} schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;
    }

    default:
      return null;
  }
};
export default ComponentRenderer;

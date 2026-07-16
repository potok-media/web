import React, { useCallback } from "react";
import type { CodeEditorSchema, UIComponentSchema } from "@potok/sdk-types";

import "../../../styles/extensions.css";

import { SafeInput } from "./SafeInput";
import { SafeToggle } from "./SafeToggle";
import { SafeSelect } from "./SafeSelect";
import { SafeSearchBar } from "./SafeSearchBar";
import { SafeMarkdown } from "./SafeMarkdown";
import { SafeCodeEditor } from "./SafeCodeEditor";
import { HostMediaComponentsRenderer } from "./HostMediaComponentsRenderer";
import { HostCommonComponentsRenderer } from "./HostCommonComponentsRenderer";
import { HostContentComponentsRenderer } from "./HostContentComponentsRenderer";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import {
  buildComponentBaseStyle,
  sdkClass,
  sdkStyleVars,
  childRendererKey,
  HOST_COMMON_TYPES,
  HOST_CONTENT_TYPES,
  HOST_MEDIA_TYPES,
  normalizeComponentType,
} from "./componentRendererUtils";
import { SdkButtonRenderer } from "./SdkButtonRenderer";
import { SdkCard, SdkGrid, SdkHStack, SdkVStack } from "./SdkLayoutPrimitives";
import { Overlay, type OverlayVariant } from "../Overlay";
import { Pressable, Field } from "../../ui";
import { PageFrame } from "../PageFrame";
import ScrollView from "../ScrollView";

interface ComponentRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ schema, pluginId }) => {
  const renderChild = useCallback(
    (child: UIComponentSchema, index: number) => (
      <ComponentRenderer key={childRendererKey(index, child)} schema={child} pluginId={pluginId} />
    ),
    [pluginId],
  );

  if (!schema?.type) return null;

  const normalizedType = normalizeComponentType(schema.type);
  const normalizedSchema = { ...schema, type: normalizedType } as UIComponentSchema;
  const baseStyle = buildComponentBaseStyle(schema);
  const props = schema.props as { visible?: boolean };

  if (props.visible === false) return null;

  if (HOST_MEDIA_TYPES.has(normalizedType)) {
    return <HostMediaComponentsRenderer schema={normalizedSchema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  if (HOST_COMMON_TYPES.has(normalizedType)) {
    return <HostCommonComponentsRenderer schema={normalizedSchema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  if (HOST_CONTENT_TYPES.has(normalizedType)) {
    return <HostContentComponentsRenderer schema={normalizedSchema} pluginId={pluginId} baseStyle={baseStyle} />;
  }

  const handleClick = () => {
    if (schema.events?.onClick) {
      ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onClick, {});
    }
  };

  switch (schema.type) {
    case "VStack":
      return <SdkVStack schema={schema} renderChild={renderChild} />;

    case "HStack":
      return <SdkHStack schema={schema} renderChild={renderChild} />;

    case "Grid":
      return <SdkGrid schema={schema} renderChild={renderChild} />;

    case "Card":
      return <SdkCard schema={schema} renderChild={renderChild} onClick={handleClick} />;

    case "Markdown":
      return <SafeMarkdown content={(schema.props as { content?: string }).content || ""} />;

    case "Heading": {
      const componentProps = schema.props as { level?: number; text?: string };
      const Level = `h${componentProps.level || 1}` as "h1" | "h2" | "h3" | "h4";
      return (
        <Level className={sdkClass(schema, `potok-heading potok-heading-${componentProps.level || 1}`)} style={sdkStyleVars(baseStyle)}>
          {componentProps.text}
        </Level>
      );
    }

    case "Text": {
      const componentProps = schema.props as {
        text?: string;
        variant?: string;
        size?: string;
        bold?: boolean;
      };
      const textClass = `potok-text potok-text-${componentProps.variant || "primary"} potok-text-${componentProps.size || "md"} ${
        componentProps.bold ? "potok-text-bold" : ""
      }`;
      return (
        <span className={sdkClass(schema, textClass)} style={sdkStyleVars(baseStyle)}>
          {componentProps.text}
        </span>
      );
    }

    case "Badge": {
      const componentProps = schema.props as { text?: string; color?: string };
      return (
        <span className={sdkClass(schema, `potok-badge potok-badge-${componentProps.color || "info"}`)} style={sdkStyleVars(baseStyle)}>
          {componentProps.text}
        </span>
      );
    }

    case "StatusRow": {
      const componentProps = schema.props as { status?: string; label?: string; value?: string };
      const rawStatus = componentProps.status || "offline";
      const statusClass = rawStatus === "success" ? "online" : rawStatus;
      return (
        <div id={schema.id} className={sdkClass(schema, "sidebar-status-row")} style={sdkStyleVars(baseStyle)}>
          <span className={`sidebar-status-dot ${statusClass}`} />
          <span className="sidebar-status-label">{componentProps.label}</span>
          {componentProps.value && <span className="sidebar-status-latency">{componentProps.value}</span>}
        </div>
      );
    }

    case "Divider":
      return <hr className={sdkClass(schema, "potok-divider")} style={sdkStyleVars(baseStyle)} />;

    case "Spacer":
      return <div className={sdkClass(schema, "potok-spacer")} style={sdkStyleVars(baseStyle)} />;

    case "Button":
      return <SdkButtonRenderer schema={schema} pluginId={pluginId} />;

    case "Input":
      return <SafeInput schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;

    case "CodeEditor":
      return <SafeCodeEditor schema={schema as CodeEditorSchema} pluginId={pluginId} baseStyle={baseStyle} />;

    case "Toggle":
      return <SafeToggle schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;

    case "Select":
      return <SafeSelect schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;

    case "SearchBar":
      return <SafeSearchBar schema={schema} pluginId={pluginId} baseStyle={baseStyle} />;

    case "Tooltip": {
      const componentProps = schema.props as { text?: string; placement?: string };
      const child = schema.children?.[0];
      return (
        <span
          className={sdkClass(schema, "sdk-tooltip")}
          data-placement={componentProps.placement || "top"}
          style={sdkStyleVars(baseStyle)}
        >
          {child ? renderChild(child, 0) : null}
          {componentProps.text && (
            <span className="sdk-tooltip-bubble" role="tooltip">{componentProps.text}</span>
          )}
        </span>
      );
    }

    case "Modal": {
      const componentProps = schema.props as {
        open?: boolean;
        title?: string;
        variant?: OverlayVariant;
        closeOnBackdrop?: boolean;
      };
      const handleClose = () => {
        if (schema.events?.onClose) ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onClose, {});
      };
      return (
        <Overlay
          open={!!componentProps.open}
          onClose={handleClose}
          variant={componentProps.variant || "modal"}
          title={componentProps.title}
          closeOnBackdrop={componentProps.closeOnBackdrop !== false}
          className="potok-page-emu"
        >
          {schema.children?.map((child, index) => renderChild(child, index))}
        </Overlay>
      );
    }

    case "Collapsible": {
      const componentProps = schema.props as { title?: string; open?: boolean };
      const isOpen = !!componentProps.open;
      const handleToggle = () => {
        if (schema.events?.onToggle) ExtensionRegistry.triggerUIEvent(pluginId, schema.events.onToggle, !isOpen);
      };
      return (
        <div id={schema.id} className={sdkClass(schema, "sdk-collapsible")} style={sdkStyleVars(baseStyle)}>
          <Pressable className="sdk-collapsible-header" onPress={handleToggle}>
            <span className="sdk-collapsible-title">{componentProps.title}</span>
            <span className={`sdk-collapsible-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true">▸</span>
          </Pressable>
          {isOpen && (
            <div className="sdk-collapsible-body">
              {schema.children?.map((child, index) => renderChild(child, index))}
            </div>
          )}
        </div>
      );
    }

    case "Field": {
      const componentProps = schema.props as { label?: string; hint?: string };
      return (
        <Field label={componentProps.label} hint={componentProps.hint} className={sdkClass(schema)}>
          {schema.children?.map((child, index) => renderChild(child, index))}
        </Field>
      );
    }

    case "Carousel": {
      const componentProps = schema.props as { spacing?: number };
      const trackStyle =
        componentProps.spacing !== undefined ? ({ gap: `${componentProps.spacing}px` } as React.CSSProperties) : undefined;
      return (
        <ScrollView
          orientation="horizontal"
          className={sdkClass(schema, "sdk-carousel")}
          renderTrack={({ trackProps }) => (
            <div {...trackProps} className={`${trackProps.className} sdk-carousel-track`} style={trackStyle}>
              {schema.children?.map((child, index) => renderChild(child, index))}
            </div>
          )}
        />
      );
    }

    case "Scroller": {
      const componentProps = schema.props as { orientation?: "horizontal" | "vertical"; spacing?: number };
      const trackStyle =
        componentProps.spacing !== undefined ? ({ gap: `${componentProps.spacing}px` } as React.CSSProperties) : undefined;
      return (
        <ScrollView
          orientation={componentProps.orientation || "vertical"}
          className={sdkClass(schema, "sdk-scroller")}
          renderTrack={({ trackProps }) => (
            <div {...trackProps} className={`${trackProps.className} sdk-scroller-track`} style={trackStyle}>
              {schema.children?.map((child, index) => renderChild(child, index))}
            </div>
          )}
        />
      );
    }

    case "Page": {
      const componentProps = schema.props as { title?: string };
      return (
        <PageFrame title={componentProps.title} className={sdkClass(schema)}>
          {schema.children?.map((child, index) => renderChild(child, index))}
        </PageFrame>
      );
    }

    case "SidebarGroup": {
      const componentProps = schema.props as { title?: string };
      return (
        <div id={schema.id} className={sdkClass(schema, "sidebar-section")} style={sdkStyleVars(baseStyle)}>
          {componentProps.title && <div className="sidebar-section-title">{componentProps.title}</div>}
          {schema.children?.map((child, index) => renderChild(child, index))}
        </div>
      );
    }

    default:
      return null;
  }
};

export default ComponentRenderer;
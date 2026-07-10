import type React from "react";
import type { UIComponentSchema } from "@potok/sdk-types";
import type { ButtonVariant } from "../../ui";

export const HOST_MEDIA_TYPES = new Set([
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
  "EpisodeCard",
]);

export const HOST_COMMON_TYPES = new Set([
  "StreamSkeletonList",
  "StreamRow",
  "StreamRowComponent",
  "StreamList",
  "LoadingSpinner",
  "ProfileSelector",
  "StreamFilterBar",
]);

/** Phase-1 generic content + primitive components (SDKContentItem-based & design-system primitives). */
export const HOST_CONTENT_TYPES = new Set([
  "ContentCard",
  "ContentRow",
  "Hero",
  "Image",
  "Icon",
  "Tabs",
  "List",
  "ProgressBar",
  "Skeleton",
  "EmptyState",
  "Alert",
  "Chip",
  "IconButton",
  "Avatar",
  "Rating",
  "TagList",
  "SectionHeader",
  "ContinueWatchingRow",
  "TopTenRow",
  "PosterGrid",
  "DetailHero",
  "Range",
  "Segmented",
  "Dropdown",
  "FileInput",
]);

const SDK_BUTTON_VARIANTS = new Set<ButtonVariant>([
  "primary", "secondary", "ghost", "danger", "accent", "glass",
]);

export function normalizeComponentType(type: string): string {
  if (type === "StreamRowComponent") return "StreamRow";
  if (type === "EpisodeSelectorPopup") return "EpisodeSelector";
  if (type === "SeasonEpisodes") return "EpisodesSection";
  return type;
}

export function resolveButtonVariant(raw: string): ButtonVariant {
  const normalized = raw.replace(/^btn-/, "");
  return SDK_BUTTON_VARIANTS.has(normalized as ButtonVariant)
    ? (normalized as ButtonVariant)
    : "secondary";
}

/** Plugin-specific SDK variants (e.g. watch-primary) map to legacy btn-* classes. */
export function resolveSdkButtonExtraClass(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/^btn-/, "");
  if (SDK_BUTTON_VARIANTS.has(normalized as ButtonVariant)) return undefined;
  return trimmed.startsWith("btn-") ? trimmed : `btn-${trimmed}`;
}

export function formatSpacingValue(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "number") return `${val}px`;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "number" ? `${v}px` : String(v))).join(" ");
  }
  return undefined;
}

/** Rejects style-token values that could break out of a single CSS property (injection guard). */
export function sanitizeStyleValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s || s.length > 200) return undefined;
  if (/[;{}<>]|url\s*\(|expression|javascript:|@import|\/\*/i.test(s)) return undefined;
  return s;
}

export function buildComponentBaseStyle(schema: UIComponentSchema): React.CSSProperties {
  const baseStyle: React.CSSProperties = {};
  const props = schema.props as Record<string, unknown>;
  if (props.width !== undefined) baseStyle.width = props.width as React.CSSProperties["width"];
  if (props.height !== undefined) baseStyle.height = props.height as React.CSSProperties["height"];
  if (props.flex !== undefined) baseStyle.flex = props.flex as React.CSSProperties["flex"];
  if (props.padding !== undefined) baseStyle.padding = formatSpacingValue(props.padding);
  if (props.margin !== undefined) baseStyle.margin = formatSpacingValue(props.margin);

  // Curated style tokens — sanitized, applied inline so they override the component's own class styling.
  const background = sanitizeStyleValue(props.background);
  if (background) baseStyle.background = background;
  const textColor = sanitizeStyleValue(props.textColor);
  if (textColor) baseStyle.color = textColor;
  const borderColor = sanitizeStyleValue(props.borderColor);
  if (borderColor) {
    baseStyle.borderColor = borderColor;
    baseStyle.borderStyle = "solid";
    baseStyle.borderWidth = "1px";
  }
  const borderRadius = sanitizeStyleValue(props.borderRadius);
  if (borderRadius) baseStyle.borderRadius = borderRadius;
  const shadow = sanitizeStyleValue(props.shadow);
  if (shadow) baseStyle.boxShadow = shadow;
  if (typeof props.opacity === "number" && Number.isFinite(props.opacity)) {
    baseStyle.opacity = Math.max(0, Math.min(1, props.opacity));
  }
  return baseStyle;
}

const SDK_STYLE_VAR_KEYS: Array<keyof React.CSSProperties> = [
  "width",
  "height",
  "flex",
  "padding",
  "margin",
  "marginBottom",
  "marginTop",
  "marginLeft",
  "marginRight",
  "gap",
  "alignItems",
  "justifyContent",
];

const SDK_STYLE_VAR_MAP: Partial<Record<keyof React.CSSProperties, string>> = {
  width: "--sdk-width",
  height: "--sdk-height",
  flex: "--sdk-flex",
  padding: "--sdk-padding",
  margin: "--sdk-margin",
  marginBottom: "--sdk-margin-bottom",
  marginTop: "--sdk-margin-top",
  marginLeft: "--sdk-margin-left",
  marginRight: "--sdk-margin-right",
  gap: "--sdk-gap",
  alignItems: "--sdk-align-items",
  justifyContent: "--sdk-justify-content",
};

/** Style-token properties applied inline as-is (not via CSS vars), so they override component classes. */
const SDK_DIRECT_STYLE_KEYS: Array<keyof React.CSSProperties> = [
  "background",
  "color",
  "borderColor",
  "borderStyle",
  "borderWidth",
  "borderRadius",
  "boxShadow",
  "opacity",
];

/** Maps SDK layout props to CSS custom properties + passes curated style tokens through inline. */
export function sdkStyleVars(style: React.CSSProperties): React.CSSProperties | undefined {
  const out: Record<string, unknown> = {};
  for (const key of SDK_STYLE_VAR_KEYS) {
    const val = style[key];
    const varName = SDK_STYLE_VAR_MAP[key];
    if (varName && val != null && val !== "") {
      out[varName] = String(val);
    }
  }
  for (const key of SDK_DIRECT_STYLE_KEYS) {
    const val = style[key];
    if (val != null && val !== "") {
      out[key] = val;
    }
  }
  return Object.keys(out).length > 0 ? (out as React.CSSProperties) : undefined;
}

export function mapJustifyContent(value: string | undefined): React.CSSProperties["justifyContent"] {
  if (value === "start") return "flex-start";
  if (value === "end") return "flex-end";
  if (value === "between") return "space-between";
  if (value === "around") return "space-around";
  return value as React.CSSProperties["justifyContent"];
}

export function toPascalCase(str: string): string {
  if (!str) return "";
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** Stable position-based key for plugin child lists. */
export function childRendererKey(index: number, child: UIComponentSchema): string {
  return `${index}-${child.type}`;
}
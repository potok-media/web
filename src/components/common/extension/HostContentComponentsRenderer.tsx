import React, { useState } from "react";
import * as Lucide from "lucide-react";
import type {
  UIComponentSchema,
  SDKContentItem,
  SDKContentBadge,
} from "@potok/sdk-types";
import { Chip, IconButton, Pressable, RangeInput, FileInput, PopoverItem } from "../../ui";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import ScrollView from "../ScrollView";
import { Grid } from "../Grid";
import { sdkStyleVars, toPascalCase } from "./componentRendererUtils";

interface HostContentComponentsRendererProps {
  schema: UIComponentSchema;
  pluginId: string;
  baseStyle: React.CSSProperties;
}

/** Resolves a Lucide icon by name (kebab or pascal); falls back to a masked /assets/icons/<name>.svg. */
const LucideIcon: React.FC<{ name?: string; size?: number | string; color?: string }> = ({
  name,
  size = "1.125rem",
  color,
}) => {
  if (!name) return null;
  const icons = Lucide as unknown as Record<string, React.ComponentType<{ size?: number | string; color?: string }>>;
  const Icon = icons[toPascalCase(name)] || icons[name];
  if (Icon) return <Icon size={size} color={color} />;
  return (
    <span
      className="sdk-btn-mask-icon"
      style={{ "--mask-url": `url(/assets/icons/${name}.svg)`, color } as React.CSSProperties}
    />
  );
};

/** Lazy image with graceful fallback → fallback URL → neutral placeholder. */
const SdkImg: React.FC<{
  src?: string;
  alt?: string;
  fallback?: string;
  fit?: "cover" | "contain";
  className?: string;
}> = ({ src, alt = "", fallback, fit = "cover", className }) => {
  const [failed, setFailed] = useState(false);
  const resolved = failed && fallback ? fallback : src;
  if (!resolved || (failed && !fallback)) {
    return <span className={`sdk-img-placeholder ${className || ""}`.trim()} aria-hidden="true" />;
  }
  return (
    <img
      className={className}
      src={resolved}
      alt={alt}
      loading="lazy"
      style={{ objectFit: fit }}
      onError={() => setFailed(true)}
    />
  );
};

const Badges: React.FC<{ badges?: SDKContentBadge[] }> = ({ badges }) => {
  if (!badges?.length) return null;
  return (
    <div className="sdk-content-card-badges">
      {badges.map((b, i) => (
        <span key={i} className={`potok-badge potok-badge-${b.color === "accent" ? "info" : b.color || "info"}`}>
          {b.text}
        </span>
      ))}
    </div>
  );
};

/** Generic poster/landscape card driven entirely by SDKContentItem — no TMDB coupling. */
const SdkContentCard: React.FC<{
  item: SDKContentItem;
  orientation?: "portrait" | "landscape";
  onClick?: () => void;
}> = ({ item, orientation = "portrait", onClick }) => {
  const progress = typeof item.progress === "number" ? Math.max(0, Math.min(1, item.progress)) : undefined;
  return (
    <Pressable
      className={`sdk-content-card sdk-content-card--${orientation}`}
      onPress={onClick}
    >
      <div className="sdk-content-card-poster">
        <SdkImg src={item.image || item.wideImage} alt={item.title} className="sdk-content-card-img" />
        {typeof item.rank === "number" && <span className="sdk-content-card-rank">{item.rank}</span>}
        <Badges badges={item.badges} />
        {progress !== undefined && (
          <div className="sdk-content-card-progress">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
      <span className="sdk-content-card-title" title={item.title}>{item.title}</span>
      {item.subtitle && <span className="sdk-content-card-subtitle">{item.subtitle}</span>}
    </Pressable>
  );
};

/** Self-contained dropdown: owns its ephemeral open state (not plugin data). */
const SdkDropdown: React.FC<{
  label?: string;
  icon?: string;
  items: { id: string; label: string; icon?: string }[];
  value?: string;
  onSelect: (id: string) => void;
}> = ({ label, icon, items, value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);
  return (
    <div className="sdk-dropdown">
      <Pressable className="sdk-dropdown-trigger" onPress={() => setOpen((o) => !o)}>
        {icon && <LucideIcon name={icon} size="1rem" />}
        <span className="sdk-dropdown-value">{selected?.label || label || "Выбрать"}</span>
        <LucideIcon name="chevron-down" size="1rem" />
      </Pressable>
      {open && (
        <>
          <div className="sdk-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="sdk-dropdown-menu" role="listbox">
            {items.map((it) => (
              <PopoverItem
                key={it.id}
                active={it.id === value}
                onClick={() => {
                  setOpen(false);
                  onSelect(it.id);
                }}
              >
                {it.icon && <LucideIcon name={it.icon} size="1rem" />}
                {it.label}
              </PopoverItem>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const HostContentComponentsRenderer: React.FC<HostContentComponentsRendererProps> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, events } = schema;
  const fire = (evt?: string, payload: unknown = {}) => {
    if (evt) ExtensionRegistry.triggerUIEvent(pluginId, evt, payload);
  };
  const styleVars = sdkStyleVars(baseStyle);

  switch (schema.type) {
    case "ContentCard": {
      const { item, orientation } = schema.props;
      if (!item) return null;
      return (
        <div id={id} className="potok-sdk-props" style={styleVars}>
          <SdkContentCard item={item} orientation={orientation} onClick={() => fire(events?.onClick, item)} />
        </div>
      );
    }

    case "ContentRow": {
      const { title, items, orientation, seeAllLabel } = schema.props;
      const list = items ?? [];
      const showSeeAll = !!events?.onSeeAllClick;
      return (
        <div id={id} className="sdk-content-row potok-sdk-props" style={styleVars}>
          {(title || showSeeAll) && (
            <div className="sdk-content-row-header">
              {title && <h3 className="sdk-content-row-title">{title}</h3>}
              {showSeeAll && (
                <Pressable
                  className="sdk-content-row-seeall"
                  onPress={() => fire(events?.onSeeAllClick, { id: schema.id, title })}
                >
                  {seeAllLabel || "Все"}
                  <LucideIcon name="chevron-right" size="1rem" />
                </Pressable>
              )}
            </div>
          )}
          <ScrollView
            orientation="horizontal"
            className="sdk-content-row-scroll"
            trackClassName="sdk-content-row-track"
          >
            {list.map((item) => (
              <SdkContentCard
                key={String(item.id)}
                item={item}
                orientation={orientation}
                onClick={() => fire(events?.onCardClick, item)}
              />
            ))}
          </ScrollView>
        </div>
      );
    }

    case "Hero": {
      const { items, playLabel, detailsLabel } = schema.props;
      const item = items?.[0];
      if (!item) return null;
      return (
        <div id={id} className="sdk-hero potok-sdk-props" style={styleVars}>
          {(item.wideImage || item.image) && (
            <SdkImg
              src={item.wideImage || item.image}
              alt={item.title}
              className="sdk-hero-backdrop"
            />
          )}
          <div className="sdk-hero-scrim" />
          <div className="sdk-hero-content">
            {item.logo ? (
              <img className="sdk-hero-logo" src={item.logo} alt={item.title} />
            ) : (
              <h2 className="sdk-hero-title">{item.title}</h2>
            )}
            <Badges badges={item.badges} />
            {item.meta?.length ? <div className="sdk-hero-meta">{item.meta.join(" • ")}</div> : null}
            {item.subtitle && <p className="sdk-hero-overview">{item.subtitle}</p>}
            <div className="sdk-hero-actions">
              <Pressable className="sdk-hero-btn sdk-hero-btn--play" onPress={() => fire(events?.onPlay, item)}>
                <LucideIcon name="play" size="1.125rem" />
                {playLabel || "Смотреть"}
              </Pressable>
              {events?.onDetails && (
                <Pressable className="sdk-hero-btn sdk-hero-btn--ghost" onPress={() => fire(events?.onDetails, item)}>
                  <LucideIcon name="info" size="1.125rem" />
                  {detailsLabel || "Подробнее"}
                </Pressable>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "Image": {
      const { src, alt, aspectRatio, fallback, rounded, fit } = schema.props;
      const radius = rounded === true ? "var(--radius-m, 0.75rem)" : typeof rounded === "string" ? rounded : undefined;
      const clickable = !!events?.onClick;
      return (
        <div
          id={id}
          className={`sdk-image potok-sdk-props ${clickable ? "sdk-image--clickable" : ""}`.trim()}
          style={{ ...styleVars, aspectRatio, borderRadius: radius }}
          onClick={clickable ? () => fire(events?.onClick, {}) : undefined}
        >
          <SdkImg src={src} alt={alt} fallback={fallback} fit={fit} className="sdk-image-img" />
        </div>
      );
    }

    case "Icon": {
      const { name, size, color } = schema.props;
      return (
        <span id={id} className="sdk-icon potok-sdk-props" style={styleVars}>
          <LucideIcon name={name} size={size ?? "1.25rem"} color={color} />
        </span>
      );
    }

    case "Tabs": {
      const { items, value } = schema.props;
      return (
        <ScrollView
          orientation="horizontal"
          className="sdk-tabs potok-sdk-props"
          trackClassName="sdk-tabs-track"
        >
          {(items ?? []).map((tab) => (
            <Pressable
              key={tab.id}
              className={`sdk-tab ${value === tab.id ? "sdk-tab--active" : ""}`.trim()}
              onPress={() => fire(events?.onChange, tab.id)}
            >
              {tab.icon && <LucideIcon name={tab.icon} size="1rem" />}
              <span>{tab.label}</span>
            </Pressable>
          ))}
        </ScrollView>
      );
    }

    case "List": {
      const { items } = schema.props;
      return (
        <div id={id} className="sdk-list potok-sdk-props" style={styleVars}>
          {(items ?? []).map((row) => (
            <Pressable
              key={row.id}
              className="sdk-list-item"
              disabled={row.disabled}
              onPress={() => fire(events?.onItemClick, row)}
            >
              {row.icon && <span className="sdk-list-item-icon"><LucideIcon name={row.icon} /></span>}
              <span className="sdk-list-item-main">
                <span className="sdk-list-item-title">{row.title}</span>
                {row.subtitle && <span className="sdk-list-item-subtitle">{row.subtitle}</span>}
              </span>
              {row.badge && <span className="potok-badge potok-badge-info">{row.badge}</span>}
              {row.trailingIcon && <span className="sdk-list-item-trailing"><LucideIcon name={row.trailingIcon} size="1rem" /></span>}
            </Pressable>
          ))}
        </div>
      );
    }

    case "ProgressBar": {
      const { value, variant, label, showValue } = schema.props;
      const pct = Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
      return (
        <div id={id} className="sdk-progress potok-sdk-props" style={styleVars}>
          {(label || showValue) && (
            <div className="sdk-progress-head">
              {label && <span className="sdk-progress-label">{label}</span>}
              {showValue && <span className="sdk-progress-value">{pct}%</span>}
            </div>
          )}
          <div className="sdk-progress-track">
            <span className={`sdk-progress-fill sdk-progress-fill--${variant || "accent"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    }

    case "Skeleton": {
      const { rounded, count } = schema.props;
      const radius = rounded === true ? "var(--radius-m, 0.75rem)" : typeof rounded === "string" ? rounded : undefined;
      const n = Math.max(1, count ?? 1);
      return (
        <div id={id} className="sdk-skeleton-group potok-sdk-props" style={styleVars}>
          {Array.from({ length: n }).map((_, i) => (
            <span key={i} className="sdk-skeleton potok-shimmer-placeholder" style={{ borderRadius: radius }} />
          ))}
        </div>
      );
    }

    case "EmptyState": {
      const { icon, title, description, actionLabel } = schema.props;
      return (
        <div id={id} className="sdk-empty potok-sdk-props" style={styleVars}>
          {icon && <span className="sdk-empty-icon"><LucideIcon name={icon} size="2rem" /></span>}
          {title && <div className="sdk-empty-title">{title}</div>}
          {description && <div className="sdk-empty-desc">{description}</div>}
          {actionLabel && events?.onAction && (
            <Pressable className="sdk-empty-action" onPress={() => fire(events?.onAction, {})}>
              {actionLabel}
            </Pressable>
          )}
        </div>
      );
    }

    case "Alert": {
      const { text, title, variant, icon } = schema.props;
      const v = variant || "info";
      const defaultIcon = { info: "info", success: "check-circle", warning: "alert-triangle", error: "alert-octagon" }[v];
      return (
        <div id={id} className={`sdk-alert sdk-alert--${v} potok-sdk-props`} style={styleVars} role="alert">
          <span className="sdk-alert-icon"><LucideIcon name={icon || defaultIcon} size="1.125rem" /></span>
          <span className="sdk-alert-body">
            {title && <span className="sdk-alert-title">{title}</span>}
            {text && <span className="sdk-alert-text">{text}</span>}
          </span>
        </div>
      );
    }

    case "Chip": {
      const { text, active, icon } = schema.props;
      return (
        <Chip
          id={id}
          active={active}
          className="potok-sdk-props"
          style={styleVars}
          onClick={() => fire(events?.onClick, {})}
        >
          {icon && <LucideIcon name={icon} size="0.95rem" />}
          {text}
        </Chip>
      );
    }

    case "IconButton": {
      const { icon, label, accent, size } = schema.props;
      return (
        <IconButton
          id={id}
          size={size}
          accentOnHover={accent}
          aria-label={label || icon}
          className="potok-sdk-props"
          style={styleVars}
          onClick={() => fire(events?.onClick, {})}
        >
          <LucideIcon name={icon} />
        </IconButton>
      );
    }

    case "Avatar": {
      const { src, name, size, fallback, shape } = schema.props;
      const initials = (name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("");
      return (
        <span
          id={id}
          className={`sdk-avatar sdk-avatar--${size || "md"} sdk-avatar--${shape || "circle"} potok-sdk-props`}
          style={styleVars}
          title={name}
        >
          {src ? (
            <SdkImg src={src} alt={name || ""} fallback={fallback} className="sdk-avatar-img" />
          ) : (
            <span className="sdk-avatar-initials">{initials || "?"}</span>
          )}
        </span>
      );
    }

    case "Rating": {
      const { value, max, showValue, size } = schema.props;
      const total = max && max > 0 ? Math.round(max) : 5;
      const val = Math.max(0, Math.min(total, value ?? 0));
      const full = Math.floor(val);
      const half = val - full >= 0.5;
      return (
        <span id={id} className={`sdk-rating sdk-rating--${size || "md"} potok-sdk-props`} style={styleVars}>
          {Array.from({ length: total }).map((_, i) => {
            const state = i < full ? "full" : i === full && half ? "half" : "empty";
            return (
              <span key={i} className={`sdk-rating-star sdk-rating-star--${state}`}>
                <LucideIcon name="star" size="1em" />
              </span>
            );
          })}
          {showValue && <span className="sdk-rating-value">{val.toFixed(1)}</span>}
        </span>
      );
    }

    case "TagList": {
      const { tags } = schema.props;
      const clickable = !!events?.onTagClick;
      return (
        <div id={id} className="sdk-taglist potok-sdk-props" style={styleVars}>
          {(tags ?? []).map((tag, i) => {
            const label = typeof tag === "string" ? tag : tag.label;
            const tagId = typeof tag === "string" ? tag : (tag.id ?? tag.label);
            return clickable ? (
              <Chip key={i} className="sdk-tag" onClick={() => fire(events?.onTagClick, tagId)}>
                {label}
              </Chip>
            ) : (
              <span key={i} className="sdk-tag sdk-tag--static">{label}</span>
            );
          })}
        </div>
      );
    }

    case "SectionHeader": {
      const { title, subtitle, actionLabel } = schema.props;
      return (
        <div id={id} className="sdk-section-header potok-sdk-props" style={styleVars}>
          <div className="sdk-section-header-titles">
            <h3 className="sdk-section-header-title">{title}</h3>
            {subtitle && <span className="sdk-section-header-subtitle">{subtitle}</span>}
          </div>
          {actionLabel && events?.onAction && (
            <Pressable className="sdk-section-header-action" onPress={() => fire(events?.onAction, {})}>
              {actionLabel}
              <LucideIcon name="chevron-right" size="1rem" />
            </Pressable>
          )}
        </div>
      );
    }

    case "ContinueWatchingRow": {
      const { title, items } = schema.props;
      return (
        <div id={id} className="sdk-content-row potok-sdk-props" style={styleVars}>
          {title && (
            <div className="sdk-content-row-header">
              <h3 className="sdk-content-row-title">{title}</h3>
            </div>
          )}
          <ScrollView orientation="horizontal" className="sdk-content-row-scroll" trackClassName="sdk-content-row-track">
            {(items ?? []).map((item) => (
              <SdkContentCard
                key={String(item.id)}
                item={item}
                orientation="landscape"
                onClick={() => fire(events?.onCardClick, item)}
              />
            ))}
          </ScrollView>
        </div>
      );
    }

    case "TopTenRow": {
      const { title, items } = schema.props;
      return (
        <div id={id} className="sdk-content-row potok-sdk-props" style={styleVars}>
          {title && (
            <div className="sdk-content-row-header">
              <h3 className="sdk-content-row-title">{title}</h3>
            </div>
          )}
          <ScrollView orientation="horizontal" className="sdk-content-row-scroll" trackClassName="sdk-topten-track">
            {(items ?? []).slice(0, 10).map((item, i) => (
              <div key={String(item.id)} className="sdk-topten-item">
                <span className="sdk-topten-rank">{item.rank ?? i + 1}</span>
                <SdkContentCard item={{ ...item, rank: undefined }} orientation="portrait" onClick={() => fire(events?.onCardClick, item)} />
              </div>
            ))}
          </ScrollView>
        </div>
      );
    }

    case "PosterGrid": {
      const { items, minWidth, loadMoreLabel } = schema.props;
      return (
        <div id={id} className="sdk-poster-grid potok-sdk-props" style={styleVars}>
          <Grid minWidth={minWidth || "10rem"} gap="var(--space-m)">
            {(items ?? []).map((item) => (
              <SdkContentCard key={String(item.id)} item={item} orientation="portrait" onClick={() => fire(events?.onCardClick, item)} />
            ))}
          </Grid>
          {events?.onLoadMore && (
            <Pressable className="sdk-poster-grid-more" onPress={() => fire(events?.onLoadMore, {})}>
              {loadMoreLabel || "Показать ещё"}
            </Pressable>
          )}
        </div>
      );
    }

    case "DetailHero": {
      const { item, actions } = schema.props;
      if (!item) return null;
      return (
        <div id={id} className="sdk-detailhero potok-sdk-props" style={styleVars}>
          {(item.wideImage || item.image) && (
            <SdkImg src={item.wideImage || item.image} alt={item.title} className="sdk-hero-backdrop" />
          )}
          <div className="sdk-hero-scrim" />
          <div className="sdk-hero-content">
            {item.logo ? (
              <img className="sdk-hero-logo" src={item.logo} alt={item.title} />
            ) : (
              <h2 className="sdk-hero-title">{item.title}</h2>
            )}
            <Badges badges={item.badges} />
            {item.meta?.length ? <div className="sdk-hero-meta">{item.meta.join(" • ")}</div> : null}
            {item.subtitle && <p className="sdk-hero-overview">{item.subtitle}</p>}
            {actions?.length ? (
              <div className="sdk-hero-actions">
                {actions.map((a) => (
                  <Pressable
                    key={a.id}
                    className={`sdk-hero-btn ${a.variant === "ghost" ? "sdk-hero-btn--ghost" : "sdk-hero-btn--play"}`}
                    onPress={() => fire(events?.onAction, a.id)}
                  >
                    {a.icon && <LucideIcon name={a.icon} size="1.125rem" />}
                    {a.label}
                  </Pressable>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    case "Range": {
      const { name, value, min, max, step, label, showValue } = schema.props;
      return (
        <div id={id} className="sdk-range potok-sdk-props" style={styleVars}>
          {(label || showValue) && (
            <div className="sdk-range-head">
              {label && <span className="sdk-range-label">{label}</span>}
              {showValue && <span className="sdk-range-value">{value ?? 0}</span>}
            </div>
          )}
          <RangeInput
            name={name}
            value={value ?? 0}
            min={min}
            max={max}
            step={step}
            onChange={(e) => fire(events?.onChange, Number(e.target.value))}
          />
        </div>
      );
    }

    case "Segmented": {
      const { items, value } = schema.props;
      return (
        <div id={id} className="sdk-segmented potok-sdk-props" style={styleVars} role="tablist">
          {(items ?? []).map((seg) => (
            <Pressable
              key={seg.id}
              role="tab"
              className={`sdk-segmented-item ${value === seg.id ? "sdk-segmented-item--active" : ""}`.trim()}
              onPress={() => fire(events?.onChange, seg.id)}
            >
              {seg.label}
            </Pressable>
          ))}
        </div>
      );
    }

    case "Dropdown": {
      const { label, icon, items, value } = schema.props;
      return (
        <div id={id} className="potok-sdk-props" style={styleVars}>
          <SdkDropdown
            label={label}
            icon={icon}
            items={items ?? []}
            value={value}
            onSelect={(sid) => fire(events?.onSelect, sid)}
          />
        </div>
      );
    }

    case "FileInput": {
      const { name, label, accept, multiple } = schema.props;
      return (
        <div id={id} className="sdk-fileinput potok-sdk-props" style={styleVars}>
          {label && <span className="sdk-fileinput-label">{label}</span>}
          <FileInput
            name={name}
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name);
              fire(events?.onChange, { names, count: names.length });
            }}
          />
        </div>
      );
    }

    default:
      return null;
  }
};

export default HostContentComponentsRenderer;

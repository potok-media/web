import React, { useState, useRef, useEffect } from "react";
import * as Lucide from "lucide-react";
import { useNavigate } from "react-router-dom";
import type {
  UIComponentSchema,
  SDKContentItem,
  SDKContentBadge,
} from "@potok/sdk-types";
import type { MediaCard as ApiMediaCard, HeroItem } from "../../../network/ApiTypes";
import { Chip, IconButton, Pressable, RangeInput, FileInput, PopoverItem } from "../../ui";
import { ExtensionRegistry } from "../../../utils/extensions/ExtensionRegistry";
import ScrollView from "../ScrollView";
import { Grid } from "../Grid";
import MediaCardComponent from "../../MediaCardComponent";
import MediaRow from "../../MediaRow";
import HeroSpotlight from "../../HeroSpotlight";
import { sdkClass, sdkStyleVars, toPascalCase } from "./componentRendererUtils";

/** Adapts a plugin's generic SDKContentItem to the app's native MediaCard shape, so generic content
 *  components render through the SAME cards/rows/hero the whole app uses (Potok owns the styling). */
const adaptContentItem = (item: SDKContentItem): ApiMediaCard => {
  const it = item as SDKContentItem & { mediaType?: "movie" | "tv"; rating?: number };
  return {
    id: (typeof item.id === "number" ? item.id : Number(item.id)) || 0,
    title: item.title,
    subtitle: item.subtitle,
    mediaType: it.mediaType === "movie" ? "movie" : "tv",
    posterSrc: item.image,
    backdropSrc: item.wideImage,
    logoSrc: item.logo,
    tmdbRating: it.rating,
    progress:
      typeof item.progress === "number"
        ? { percentage: Math.round(Math.max(0, Math.min(1, item.progress)) * 100) }
        : undefined,
  } as ApiMediaCard;
};

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

/** Poster grid with the app's native cards + infinite-scroll auto-load (same pattern as the library page). */
const SdkPosterGrid: React.FC<{
  cards: ApiMediaCard[];
  minWidth?: string;
  onCardClick: (card: ApiMediaCard) => void;
  onLoadMore?: () => void;
}> = ({ cards, minWidth, onCardClick, onLoadMore }) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // A new page arrived (item count grew) → re-arm the sentinel for the next auto-load.
  useEffect(() => {
    loadingRef.current = false;
  }, [cards.length]);

  useEffect(() => {
    if (!onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          onLoadMoreRef.current?.();
        }
      },
      { rootMargin: "1200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!onLoadMore]);

  return (
    <div className="sdk-poster-grid">
      <Grid className="library-grid" minWidth={minWidth}>
        {cards.map((card) => (
          <MediaCardComponent key={`${card.mediaType}-${card.id}`} item={card} onClick={onCardClick} />
        ))}
      </Grid>
      {onLoadMore && <div ref={sentinelRef} className="library-pagination-wrapper" aria-hidden="true" />}
    </div>
  );
};

/** Ranked Top-10 row: big outlined rank numbers + native cards, with the same hover scroll-arrows the
 *  episodes carousel uses (SDK ScrollView alone scrolls by wheel/drag but shows no buttons). */
const SdkTopTenRow: React.FC<{
  schema: UIComponentSchema;
  id?: string;
  title?: string;
  cards: ApiMediaCard[];
  onCardClick: (card: ApiMediaCard) => void;
  onSeeAll?: () => void;
}> = ({ schema, id, title, cards, onCardClick, onSeeAll }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollLimits = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(checkScrollLimits, 80);
    const observer = new ResizeObserver(() => checkScrollLimits());
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [cards.length]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.querySelector(".sdk-topten-item") as HTMLElement | null;
    const amount = cardEl ? cardEl.clientWidth * 3 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (!cards.length) return null;

  return (
    <div id={id} className={sdkClass(schema, "carousel-container")}>
      {title && (
        <div className="carousel-header">
          {onSeeAll ? (
            <Pressable className="carousel-title-link" onPress={onSeeAll}>
              <h2 className="carousel-title">{title}</h2>
              <Lucide.ChevronRight className="carousel-title-chevron" size="1.25rem" />
            </Pressable>
          ) : (
            <h2 className="carousel-title">{title}</h2>
          )}
        </div>
      )}
      <div className="sdk-topten-wrapper">
        {canScrollLeft && (
          <IconButton className="carousel-nav-btn left" onClick={() => handleScroll("left")} aria-label="Scroll back">
            <Lucide.ChevronLeft size="1.25rem" />
          </IconButton>
        )}
        <ScrollView
          orientation="horizontal"
          className="carousel-viewport"
          viewportRef={scrollRef}
          onScroll={checkScrollLimits}
          renderTrack={({ trackProps }) => (
            <div className={`carousel-row sdk-topten-track ${trackProps.className}`}>
              {cards.map((card, i) => (
                <div key={`${card.mediaType}-${card.id}`} className="sdk-topten-item">
                  <span className="sdk-topten-rank">{i + 1}</span>
                  <MediaCardComponent item={card} onClick={onCardClick} />
                </div>
              ))}
            </div>
          )}
        />
        {canScrollRight && (
          <IconButton className="carousel-nav-btn right" onClick={() => handleScroll("right")} aria-label="Scroll forward">
            <Lucide.ChevronRight size="1.25rem" />
          </IconButton>
        )}
      </div>
    </div>
  );
};

export const HostContentComponentsRenderer: React.FC<HostContentComponentsRendererProps> = ({
  schema,
  pluginId,
  baseStyle,
}) => {
  const { id, events } = schema;
  const navigate = useNavigate();
  const fire = (evt?: string, payload: unknown = {}) => {
    if (evt) ExtensionRegistry.triggerUIEvent(pluginId, evt, payload);
  };
  const styleVars = sdkStyleVars(baseStyle);
  // Native card click: fire the plugin callback if it set one, else navigate to the details page.
  const cardClick = (card: ApiMediaCard) => {
    if (events?.onCardClick) fire(events.onCardClick, card);
    else navigate(`/media/${card.mediaType}/${card.id}`);
  };

  switch (schema.type) {
    case "ContentCard": {
      const { item } = schema.props;
      if (!item) return null;
      return (
        <div id={id} className={sdkClass(schema, "host-media-card-wrap")} style={styleVars}>
          <MediaCardComponent
            item={adaptContentItem(item)}
            onClick={events?.onClick ? () => fire(events?.onClick, item) : undefined}
          />
        </div>
      );
    }

    case "ContentRow": {
      const { title, items } = schema.props;
      const cards = (items ?? []).map(adaptContentItem);
      return (
        <MediaRow
          key={id}
          id={schema.id}
          title={title || ""}
          items={cards}
          onCardClick={cardClick}
          onSeeAllClick={
            events?.onSeeAllClick
              ? (rid, rtitle) => fire(events.onSeeAllClick, { id: rid, title: rtitle })
              : undefined
          }
        />
      );
    }

    case "Hero": {
      const { items } = schema.props;
      const heroItems: HeroItem[] = (items ?? []).map((it) => {
        const card = adaptContentItem(it);
        return { id: card.id, card, backdropSrc: card.backdropSrc || card.posterSrc };
      });
      if (!heroItems.length) return null;
      return (
        <div id={id} className={sdkClass(schema, "host-hero-spotlight-wrap")} style={styleVars}>
          <HeroSpotlight
            items={heroItems}
            onPlay={(h) =>
              events?.onPlay
                ? fire(events.onPlay, h.card)
                : navigate(`/media/${h.card.mediaType}/${h.card.id}?play=true`)
            }
            onDetails={(h) =>
              events?.onDetails
                ? fire(events.onDetails, h.card)
                : navigate(`/media/${h.card.mediaType}/${h.card.id}`)
            }
          />
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
          className={sdkClass(schema, "sdk-image", clickable && "sdk-image--clickable")}
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
        <span id={id} className={sdkClass(schema, "sdk-icon")} style={styleVars}>
          <LucideIcon name={name} size={size ?? "1.25rem"} color={color} />
        </span>
      );
    }

    case "Tabs": {
      const { items, value } = schema.props;
      return (
        <ScrollView
          orientation="horizontal"
          className={sdkClass(schema, "sdk-tabs")}
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
        <div id={id} className={sdkClass(schema, "sdk-list")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-progress")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-skeleton-group")} style={styleVars}>
          {Array.from({ length: n }).map((_, i) => (
            <span key={i} className="sdk-skeleton potok-shimmer-placeholder" style={{ borderRadius: radius }} />
          ))}
        </div>
      );
    }

    case "EmptyState": {
      const { icon, title, description, actionLabel } = schema.props;
      return (
        <div id={id} className={sdkClass(schema, "sdk-empty")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, `sdk-alert sdk-alert--${v}`)} style={styleVars} role="alert">
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
          className={sdkClass(schema)}
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
          className={sdkClass(schema)}
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
          className={sdkClass(schema, `sdk-avatar sdk-avatar--${size || "md"} sdk-avatar--${shape || "circle"}`)}
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
        <span id={id} className={sdkClass(schema, `sdk-rating sdk-rating--${size || "md"}`)} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-taglist")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-section-header")} style={styleVars}>
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
      const cards = (items ?? []).map(adaptContentItem);
      if (!cards.length) return null;
      return (
        <div id={id} className={sdkClass(schema, "carousel-container")}>
          {title && (
            <div className="carousel-header">
              <h2 className="carousel-title">{title}</h2>
            </div>
          )}
          <ScrollView
            orientation="horizontal"
            className="carousel-viewport"
            renderTrack={({ trackProps }) => (
              <div className={`carousel-row ${trackProps.className}`}>
                {cards.map((card) => (
                  <MediaCardComponent
                    key={`${card.mediaType}-${card.id}`}
                    item={card}
                    showContinueOverlay
                    onClick={cardClick}
                  />
                ))}
              </div>
            )}
          />
        </div>
      );
    }

    case "TopTenRow": {
      const { title, items } = schema.props;
      const cards = (items ?? []).slice(0, 10).map(adaptContentItem);
      if (!cards.length) return null;
      return (
        <SdkTopTenRow
          schema={schema}
          id={id}
          title={title}
          cards={cards}
          onCardClick={cardClick}
          onSeeAll={events?.onSeeAllClick ? () => fire(events.onSeeAllClick, {}) : undefined}
        />
      );
    }

    case "PosterGrid": {
      const { items, minWidth } = schema.props;
      const cards = (items ?? []).map(adaptContentItem);
      return (
        <div id={id} className={sdkClass(schema)} style={styleVars}>
          <SdkPosterGrid
            cards={cards}
            minWidth={minWidth}
            onCardClick={cardClick}
            onLoadMore={events?.onLoadMore ? () => fire(events?.onLoadMore, {}) : undefined}
          />
        </div>
      );
    }

    case "DetailHero": {
      const { item, actions } = schema.props;
      if (!item) return null;
      return (
        <div id={id} className={sdkClass(schema, "sdk-detailhero")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-range")} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-segmented")} style={styleVars} role="tablist">
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
        <div id={id} className={sdkClass(schema)} style={styleVars}>
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
        <div id={id} className={sdkClass(schema, "sdk-fileinput")} style={styleVars}>
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

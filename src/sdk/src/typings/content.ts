export const contentDts = `
  /** Generic content card built from your data model (SDKContentItem). */
  interface ContentCardBuilder extends UIComponent {
    /** Content object (SDKContentItem). */
    item(v: SDKContentItem): this;
    /** Card orientation. */
    orientation(v: 'portrait' | 'landscape'): this;
    /** Callback fired when the card is clicked. */
    onClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Generic horizontal row of ContentCards (SDKContentItem[]). */
  interface ContentRowBuilder extends UIComponent {
    /** Section title. */
    title(v: string): this;
    /** Array of content items. */
    items(v: SDKContentItem[]): this;
    /** Orientation of the row cards. */
    orientation(v: 'portrait' | 'landscape'): this;
    /** Label of the "See all" button. */
    seeAllLabel(v: string): this;
    /** Callback fired when a card is clicked. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
    /** Callback fired when "See all" is clicked. */
    onSeeAllClick(cb: () => void): this;
  }

  /** Generic promo banner built from your data model (SDKContentItem[]). */
  interface HeroBuilder extends UIComponent {
    /** Array of featured items (the first one is rendered). */
    items(v: SDKContentItem[]): this;
    /** Label of the primary button. */
    playLabel(v: string): this;
    /** Label of the "Details" button. */
    detailsLabel(v: string): this;
    /** Callback fired by the primary button. */
    onPlay(cb: (item: SDKContentItem) => void): this;
    /** Callback fired by the "Details" button. */
    onDetails(cb: (item: SDKContentItem) => void): this;
  }

  /** Responsive image with lazy loading and a fallback picture. */
  interface ImageBuilder extends UIComponent {
    /** Alternative text. */
    alt(v: string): this;
    /** Aspect ratio (e.g. '16/9'). */
    aspectRatio(v: string): this;
    /** Fallback image URL. */
    fallback(v: string): this;
    /** Corner rounding. */
    rounded(v: boolean | string): this;
    /** Fit mode. */
    fit(v: 'cover' | 'contain'): this;
    /** Click callback. */
    onClick(cb: () => void): this;
  }

  /** A single Lucide icon. */
  interface IconBuilder extends UIComponent {
    /** Icon size. */
    size(v: string | number): this;
    /** Icon color. */
    color(v: string): this;
  }

  /** Horizontal tab bar. */
  interface TabsBuilder extends UIComponent {
    /** Tabs: { id, label, icon? }. */
    items(v: { id: string; label: string; icon?: string }[]): this;
    /** Active tab. */
    value(v: string): this;
    /** Callback fired when the active tab changes (id). */
    onChange(cb: (id: string) => void): this;
  }

  /** List of clickable rows. */
  interface ListBuilder extends UIComponent {
    /** List rows. */
    items(v: { id: string; title: string; subtitle?: string; icon?: string; badge?: string; trailingIcon?: string; disabled?: boolean }[]): this;
    /** Callback fired when a row is clicked. */
    onItemClick(cb: (item: SDKListItem) => void): this;
  }

  /** Tooltip that wraps a child element. */
  interface TooltipBuilder extends UIComponent {
    /** Tooltip placement. */
    placement(v: 'top' | 'bottom' | 'left' | 'right'): this;
    /** Wrapped element. */
    child(elm: UIComponent): this;
  }

  /** Progress bar (0..1). */
  interface ProgressBarBuilder extends UIComponent {
    /** Value 0..1. */
    value(v: number): this;
    /** Bar color. */
    variant(v: 'accent' | 'success' | 'warning' | 'error'): this;
    /** Label. */
    label(v: string): this;
    /** Whether to show the percentage. */
    showValue(v: boolean): this;
  }

  /** Shimmering loading placeholder. */
  interface SkeletonBuilder extends UIComponent {
    /** Corner rounding. */
    rounded(v: boolean | string): this;
    /** Number of placeholder lines. */
    count(v: number): this;
  }

  /** Empty-state placeholder. */
  interface EmptyStateBuilder extends UIComponent {
    /** Centered icon. */
    icon(v: string): this;
    /** Title. */
    title(v: string): this;
    /** Description. */
    description(v: string): this;
    /** Action button label. */
    actionLabel(v: string): this;
    /** Action button callback. */
    onAction(cb: () => void): this;
  }

  /** Inline notification (info/success/warning/error). */
  interface AlertBuilder extends UIComponent {
    /** Title. */
    title(v: string): this;
    /** Color scheme. */
    variant(v: 'info' | 'success' | 'warning' | 'error'): this;
    /** Icon. */
    icon(v: string): this;
  }

  /** Toggleable chip/tag. */
  interface ChipBuilder extends UIComponent {
    /** Active state. */
    active(v: boolean): this;
    /** Icon before the text. */
    icon(v: string): this;
    /** Click callback. */
    onClick(cb: () => void): this;
  }

  /** Square icon button. */
  interface IconButtonBuilder extends UIComponent {
    /** aria-label. */
    label(v: string): this;
    /** Accent highlight on hover. */
    accent(v: boolean): this;
    /** Size. */
    size(v: 'sm' | 'md' | 'lg'): this;
    /** Click callback. */
    onClick(cb: () => void): this;
  }
`;

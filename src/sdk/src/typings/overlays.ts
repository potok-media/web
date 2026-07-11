export const overlaysDts = `
  /** Modal window / sheet / popover rendered on top of the app (reuses Overlay). */
  interface ModalBuilder extends UIComponent {
    /** Controls window visibility. */
    open(v: boolean): this;
    /** Window title. */
    title(v: string): this;
    /** Overlay type. */
    variant(v: 'modal' | 'sheet' | 'popover'): this;
    /** Whether to close on a backdrop click. */
    closeOnBackdrop(v: boolean): this;
    /** Close callback (ESC / backdrop / close button). */
    onClose(cb: () => void): this;
    /** Window content. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Collapsible section (header + hideable body). */
  interface CollapsibleBuilder extends UIComponent {
    /** Section title. */
    title(v: string): this;
    /** Whether the section is expanded. */
    open(v: boolean): this;
    /** Toggle callback (receives the new boolean state). */
    onToggle(cb: (open: boolean) => void): this;
    /** Section body content. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Avatar: an image with initials fallback derived from the name. */
  interface AvatarBuilder extends UIComponent {
    /** Name (initials for the fallback + alt text). */
    name(v: string): this;
    /** Size. */
    size(v: 'sm' | 'md' | 'lg'): this;
    /** Fallback image URL. */
    fallback(v: string): this;
    /** Shape. */
    shape(v: 'circle' | 'square'): this;
  }

  /** Star rating (0..max). */
  interface RatingBuilder extends UIComponent {
    /** Rating value. */
    value(v: number): this;
    /** Maximum number of stars. */
    max(v: number): this;
    /** Whether to show the numeric value. */
    showValue(v: boolean): this;
    /** Star size. */
    size(v: 'sm' | 'md' | 'lg'): this;
  }

  /** List of tags/genres (static or clickable). */
  interface TagListBuilder extends UIComponent {
    /** Array of tags: strings or { id?, label }. */
    tags(v: Array<string | { id?: string; label: string }>): this;
    /** Tag click callback (receives the id/string). */
    onTagClick(cb: (id: string) => void): this;
  }

  /** Section header with a subtitle and an action button. */
  interface SectionHeaderBuilder extends UIComponent {
    /** Subtitle. */
    subtitle(v: string): this;
    /** Action button label. */
    actionLabel(v: string): this;
    /** Action button callback. */
    onAction(cb: () => void): this;
  }

  /** "Continue watching" row: horizontal cards with progress (SDKContentItem[]). */
  interface ContinueWatchingRowBuilder extends UIComponent {
    /** Row title. */
    title(v: string): this;
    /** Items (use the progress field 0..1). */
    items(v: SDKContentItem[]): this;
    /** Callback fired when a card is clicked. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Ranked "Top 10" row: a large number + poster. */
  interface TopTenRowBuilder extends UIComponent {
    /** Row title. */
    title(v: string): this;
    /** Up to 10 items (the number comes from the rank field or the position). */
    items(v: SDKContentItem[]): this;
    /** Callback fired when a card is clicked. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
  }

  /** Responsive poster grid with infinite loading. */
  interface PosterGridBuilder extends UIComponent {
    /** Grid items. */
    items(v: SDKContentItem[]): this;
    /** Minimum column width (e.g. '10rem'). */
    minWidth(v: string): this;
    /** Load-more button label. */
    loadMoreLabel(v: string): this;
    /** Callback fired when a card is clicked. */
    onCardClick(cb: (item: SDKContentItem) => void): this;
    /** Load-more callback (the button appears only when set). */
    onLoadMore(cb: () => void): this;
  }

  /** Detail-page hero: background, logo/title, meta and action buttons. */
  interface DetailHeroBuilder extends UIComponent {
    /** Featured item (SDKContentItem). */
    item(v: SDKContentItem): this;
    /** Action buttons: { id, label, icon?, variant? }. */
    actions(v: Array<{ id: string; label: string; icon?: string; variant?: string }>): this;
    /** Button click callback (receives the action id). */
    onAction(cb: (actionId: string) => void): this;
  }

  /** Slider (value range). */
  interface RangeBuilder extends UIComponent {
    /** Current value. */
    value(v: number): this;
    /** Minimum. */
    min(v: number): this;
    /** Maximum. */
    max(v: number): this;
    /** Step. */
    step(v: number): this;
    /** Label above the slider. */
    label(v: string): this;
    /** Whether to show the current value. */
    showValue(v: boolean): this;
    /** Change callback (receives a number). */
    onChange(cb: (value: number) => void): this;
  }

  /** Segmented control (compact option switcher). */
  interface SegmentedBuilder extends UIComponent {
    /** Segments: { id, label }. */
    items(v: { id: string; label: string }[]): this;
    /** Active segment. */
    value(v: string): this;
    /** Change callback (receives the id). */
    onChange(cb: (id: string) => void): this;
  }
`;

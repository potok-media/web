export const containersDts = `
  /** Dropdown menu: a trigger button + a list of options (internal open state). */
  interface DropdownBuilder extends UIComponent {
    /** Trigger button text (default label). */
    label(v: string): this;
    /** Icon in the trigger. */
    icon(v: string): this;
    /** Menu items: { id, label, icon? }. */
    items(v: Array<{ id: string; label: string; icon?: string }>): this;
    /** Selected item. */
    value(v: string): this;
    /** Item select callback (receives the id). */
    onSelect(cb: (id: string) => void): this;
  }

  /** File picker field. onChange receives { names, count }. */
  interface FileInputBuilder extends UIComponent {
    /** Label above the field. */
    label(v: string): this;
    /** Accepted types (accept), e.g. 'image/*'. */
    accept(v: string): this;
    /** Allow selecting multiple files. */
    multiple(v: boolean): this;
    /** File(s) select callback. Receives { names: string[], count }. */
    onChange(cb: (info: { names: string[]; count: number }) => void): this;
  }

  /** Control wrapper with a label and a hint. */
  interface FieldBuilder extends UIComponent {
    /** Label above the control. */
    label(v: string): this;
    /** Hint below the control. */
    hint(v: string): this;
    /** Nested control. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Horizontal carousel of arbitrary elements with scroll-snap. */
  interface CarouselBuilder extends UIComponent {
    /** Spacing between elements (px). */
    spacing(v: number): this;
    /** Carousel elements. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Scroll container (horizontal/vertical) for arbitrary elements. */
  interface ScrollerBuilder extends UIComponent {
    /** Scroll direction. */
    orientation(v: 'horizontal' | 'vertical'): this;
    /** Spacing between elements (px). */
    spacing(v: number): this;
    /** Elements. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Page wrapper (title + content) for custom plugin pages. */
  interface PageBuilder extends UIComponent {
    /** Page title. */
    title(v: string): this;
    /** Spacing between content elements (px). */
    spacing(v: number): this;
    /** Page content. */
    children(elms: UIComponent[]): this;
    /** Appends a single child. */
    child(elm: UIComponent): this;
  }

  /** Sidebar category: its own section with a header and buttons (like "LIBRARY"). */
  interface SidebarGroupBuilder extends UIComponent {
    /** Category title (usually uppercase). */
    title(v: string): this;
    /** Category items (usually Button().variant('sidebar-item')). */
    children(elms: UIComponent[]): this;
    /** Appends a single item. */
    child(elm: UIComponent): this;
  }
`;

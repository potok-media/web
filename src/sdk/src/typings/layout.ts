export const layoutDts = `
  /** Vertical stack (VStack) that lays out its children top to bottom. */
  interface VStackBuilder extends UIComponent {
    /** Spacing in pixels between children. */
    spacing(v: number): this;
    /** Cross-axis alignment of children. */
    alignItems(v: 'start' | 'center' | 'end' | 'stretch'): this;
    /** Main-axis distribution of children. */
    justifyContent(v: 'start' | 'center' | 'end' | 'between' | 'around'): this;
    /** Sets the array of stack children. */
    children(elms: UIComponent[]): this;
    /** Appends a single child to the stack. */
    child(elm: UIComponent): this;
  }

  /** Horizontal stack (HStack) that lays out its children left to right in a single row. */
  interface HStackBuilder extends UIComponent {
    /** Spacing in pixels between children. */
    spacing(v: number): this;
    /** Cross-axis alignment of children. */
    alignItems(v: 'start' | 'center' | 'end' | 'stretch'): this;
    /** Main-axis distribution of children. */
    justifyContent(v: 'start' | 'center' | 'end' | 'between' | 'around'): this;
    /** Sets the array of stack children. */
    children(elms: UIComponent[]): this;
    /** Appends a single child to the stack. */
    child(elm: UIComponent): this;
  }

  /** Grid layout that arranges uniform cards and computes the column count automatically. */
  interface GridBuilder extends UIComponent {
    /** Minimum width of a single cell (e.g. '180px'). */
    minWidth(v: string): this;
    /** Gap between grid cells (e.g. '12px'). */
    gap(v: string): this;
    /** Grid children. */
    children(elms: UIComponent[]): this;
  }

  /** Card — a translucent glass container with a border and rounded corners. */
  interface CardBuilder extends UIComponent {
    /** Sets the card title. */
    title(v: string): this;
    /** Sets the card subtitle. */
    subtitle(v: string): this;
    /** Sets the single child of the card. */
    child(elm: UIComponent): this;
  }

  /** Heading component. */
  interface HeadingBuilder extends UIComponent {
    /** Heading level (from 1 to 6). */
    level(v: number): this;
  }

  /** Text block (Text) with styling and size options. */
  interface TextBuilder extends UIComponent {
    /** Text color variant. */
    variant(v: 'primary' | 'secondary' | 'hint' | 'error' | 'success' | 'danger' | 'ghost' | 'sidebar-item'): this;
    /** Font size. */
    size(v: 'xs' | 'sm' | 'md' | 'lg'): this;
    /** Makes the text bold. */
    bold(v: boolean): this;
  }

  /** Component that renders formatted Markdown text. */
  interface MarkdownBuilder extends UIComponent {}

  /** Badge — a colored label used to show a status. */
  interface BadgeBuilder extends UIComponent {
    /** Badge color status. */
    color(v: 'info' | 'success' | 'warning' | 'error'): this;
  }

  /** Thin horizontal separator line (Divider). */
  interface DividerBuilder extends UIComponent {}

  /** Elastic invisible spacer for flex containers. */
  interface SpacerBuilder extends UIComponent {}

  /** Status row (StatusRow) showing an indicator, a label and an optional value. */
  interface StatusRowBuilder extends UIComponent {
    /** Sets the indicator status ('online' | 'offline' | 'success' | 'warning' | 'error'). */
    status(v: 'online' | 'offline' | 'success' | 'warning' | 'error' | string): this;
    /** Sets the trailing text value (e.g. ping or latency). */
    value(v: string): this;
  }
`;

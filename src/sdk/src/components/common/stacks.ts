import { UIComponent, LayoutComponent } from "../base";

/**
 * VStack (Vertical stack)
 *
 * A container that arranges child components vertically, one below another.
 *
 * @example
 * // Vertical stack
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(20)
 *     .alignItems("center")
 *     .child(Heading("Heading"))
 *     .child(Text("A paragraph of text below the heading."))
 *     .child(Button("OK"))
 * );
 */
export class VStackBuilder extends LayoutComponent {
  constructor() {
    super("VStack");
  }
}

/**
 * HStack (Horizontal stack)
 *
 * A container that arranges child components horizontally from left to right.
 *
 * @example
 * // Horizontal stack
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .spacing(15)
 *     .justifyContent("between")
 *     .alignItems("center")
 *     .child(Text("Item 1"))
 *     .child(Text("Item 2"))
 *     .child(Button("Button"))
 * );
 */
export class HStackBuilder extends LayoutComponent {
  constructor() {
    super("HStack");
  }
}

/**
 * Grid (Grid)
 *
 * A container that renders a responsive grid of cells with a fixed minimum column width.
 *
 * @example
 * // Responsive grid
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Grid()
 *     .minWidth("8rem")
 *     .gap("1rem")
 *     .child(Card().title("Card 1").child(Text("Text")))
 *     .child(Card().title("Card 2").child(Text("Text")))
 *     .child(Card().title("Card 3").child(Text("Text")))
 * );
 */
export class GridBuilder extends LayoutComponent {
  private _minWidth: string;
  private _gap: string;

  constructor() {
    super("Grid");
    this._minWidth = "180px";
    this._gap = "var(--space-m)";
  }

  /**
   * The minimum allowed width of a single grid column (for example, '12rem').
   *
   * @param v Method value
   * @default '180px'
   */
  minWidth(v: string): this {
    this._minWidth = v;
    return this;
  }

  /**
   * The gap/spacing between grid cells (for example, '1rem').
   *
   * @param v Method value
   * @default 'var(--space-m)'
   */
  gap(v: string): this {
    this._gap = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      ...super.getProps(),
      minWidth: this._minWidth,
      gap: this._gap
    };
  }
}

/**
 * Spacer (Spacer)
 *
 * An empty flexible element (spacer) that fills all available free space inside a flex container. Useful inside HStack or VStack to push elements toward the edges.
 *
 * @example
 * // Spacer
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .child(Text("Left side"))
 *     .child(Spacer())
 *     .child(Text("Right side"))
 * );
 */
export class SpacerBuilder extends UIComponent {
  constructor() {
    super("Spacer");
  }

  protected override getProps(): Record<string, unknown> {
    return {};
  }
}

/**
 * Divider (Divider)
 *
 * A thin horizontal divider line for visually separating content blocks or rows in lists.
 *
 * @example
 * // Divider
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(Text("Text above"))
 *     .child(Divider())
 *     .child(Text("Text below"))
 * );
 */
export class DividerBuilder extends UIComponent {
  constructor() {
    super("Divider");
  }

  protected override getProps(): Record<string, unknown> {
    return {};
  }
}

// Sidebar category group — lets a plugin add its OWN titled section (like "MEDIA LIBRARY") to the sidebar,
// not just buttons into existing sections. Use with sidebar-item Buttons inside the 'sidebar-groups' slot.
/**
 * SidebarGroup (Sidebar category)
 *
 * A custom sidebar section with a category title and buttons — like the built-in "MEDIA LIBRARY". Contributed into the 'sidebar-groups' slot (registerSlotContribution), with Button().variant('sidebar-item') buttons placed inside. Lets a plugin add a WHOLE category, not just buttons into an existing one.
 *
 * @example
 * // A custom sidebar category (in a real plugin — a layout for the 'sidebar-groups' slot)
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   SidebarGroup("Anime")
 *     .child(
 *       Button("Catalog")
 *         .variant("sidebar-item")
 *         .icon("clapperboard")
 *         .onClick(() => ui.navigateTo("/extensions/potok-shikimori"))
 *     )
 *     .child(
 *       Button("Random")
 *         .variant("sidebar-item")
 *         .icon("shuffle")
 *         .onClick(() => ui.showHUD("info", "Random anime"))
 *     )
 * );
 */
export class SidebarGroupBuilder extends LayoutComponent {
  private _title?: string;

  constructor(title: string) {
    super("SidebarGroup");
    this._title = title;
  }

  title(v: string): this {
    this._title = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title };
  }
}

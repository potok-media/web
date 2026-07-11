import { UIComponent, LayoutComponent, type CompiledComponent } from "../base";

/**
 * Card (Glass card)
 *
 * A card panel with borders, blur, and a frosted-glass effect (glassmorphism). Used to visually group logical blocks.
 *
 * @example
 * // Card
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Card()
 *     .title("Basic details")
 *     .subtitle("Additional information")
 *     .child(Text("This text is inside the card."))
 * );
 */
export class CardBuilder extends UIComponent {
  private _title?: string;
  private _subtitle?: string;
  private _child?: UIComponent;

  constructor() {
    super("Card");
  }

  /**
   * The card title displayed at the top of the card.
   *
   * @param v Method value
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * The card subtitle displayed in a small muted font.
   *
   * @param v Method value
   */
  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

  /**
   * Nests a single child component inside the card body.
   *
   * @param v Method value
   */
  child(elm: UIComponent): this {
    this._child = elm;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      title: this._title,
      subtitle: this._subtitle
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._child) {
      if (typeof this._child.compile !== "function") {
        json.children = [{
          type: "Text",
          id: "child_fallback",
          props: {
            text: String(this._child)
          }
        }];
      } else {
        const childId = this._child._hasCustomId ? this._child._id : "child";
        json.children = [this._child.compile(`${path}/${childId}`)];
      }
    }
    return json;
  }
}

/**
 * Carousel (Carousel)
 *
 * A horizontal carousel of arbitrary elements with scroll snapping. Unlike content rows, it accepts any components.
 *
 * @example
 * // Card carousel
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Carousel()
 *     .spacing(16)
 *     .children([
 *       Card().title("Slide 1").child(Text("First slide")),
 *       Card().title("Slide 2").child(Text("Second slide")),
 *       Card().title("Slide 3").child(Text("Third slide"))
 *     ])
 * );
 */
export class CarouselBuilder extends LayoutComponent {
  constructor() {
    super("Carousel");
  }
}

/**
 * Scroller (Scroll container)
 *
 * A generic scrollable container (horizontal or vertical) for arbitrary elements.
 *
 * @example
 * // Horizontal tag strip
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Scroller()
 *     .orientation("horizontal")
 *     .spacing(12)
 *     .children([
 *       Badge("Tag 1"),
 *       Badge("Tag 2"),
 *       Badge("Tag 3"),
 *       Badge("Tag 4"),
 *       Badge("Tag 5")
 *     ])
 * );
 */
export class ScrollerBuilder extends LayoutComponent {
  private _orientation?: "horizontal" | "vertical";

  constructor() {
    super("Scroller");
  }

  /**
   * Scroll direction.
   *
   * @param v Method value
   * @default 'vertical'
   */
  orientation(v: "horizontal" | "vertical"): this { this._orientation = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { ...super.getProps(), orientation: this._orientation };
  }
}

/**
 * Page (Page shell)
 *
 * A shell for a custom plugin page with a title and content area (built on PageFrame).
 *
 * @example
 * // Page shell
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Page()
 *     .title("My page")
 *     .spacing(16)
 *     .children([
 *       SectionHeader("Section"),
 *       Text("Full-width page content wrapped in the PageFrame shell.").variant("secondary")
 *     ])
 * );
 */
export class PageBuilder extends LayoutComponent {
  private _title?: string;

  constructor() {
    super("Page");
  }

  /**
   * The page title in the header.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { ...super.getProps(), title: this._title };
  }
}

/**
 * Field (Form field)
 *
 * A control wrapper with a label above and a hint below. Wraps any nested control (Input, Select, Range, etc.).
 *
 * @example
 * // Field with a label and a hint
 * const { ui, createState } = PotokSDK;
 * const state = createState({ url: "" });
 *
 * function draw() {
 *   ui.render(
 *     Field()
 *       .label("Server address")
 *       .hint("For example, http://localhost:8080")
 *       .child(
 *         Input("url")
 *           .placeholder("http://...")
 *           .value(state.url)
 *           .onChange((v) => state.url = v)
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class FieldBuilder extends LayoutComponent {
  private _label?: string;
  private _hint?: string;

  constructor() {
    super("Field");
  }

  /**
   * The label above the control.
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * The hint below the control.
   *
   * @param v Method value
   */
  hint(v: string): this { this._hint = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { label: this._label, hint: this._hint };
  }
}

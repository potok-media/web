import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Button (Button)
 *
 * An interactive UI element for performing various actions, starting playback, or navigating between pages.
 *
 * @example
 * // Control buttons
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Card()
 *     .title("Player controls")
 *     .child(
 *       HStack()
 *         .spacing(10)
 *         .child(Button("Watch").variant("primary").icon("play").onClick(() => ui.showHUD("success", "Playing...")))
 *         .child(Button("Settings").variant("secondary").icon("settings").onClick(() => ui.showHUD("info", "Opening settings...")))
 *         .child(Button("Delete").variant("danger").icon("trash").onClick(() => ui.showHUD("error", "Item deleted")))
 *     )
 * );
 */
export class ButtonBuilder extends UIComponent {
  private _text: string;
  private _variant: string;
  private _icon?: string;
  private _onClick?: CallbackFunction;

  constructor(t: string) {
    super("Button");
    this._text = t;
    this._variant = 'secondary';
  }

  /**
   * The visual style of the button (primary accent color, neutral gray, warning red, transparent background, or the sidebar item style).
   *
   * @param v Method value
   * @default 'secondary'
   */
  variant(v: string): this {
    this._variant = v;
    return this;
  }

  /**
   * An icon name from the Lucide collection (for example, 'play', 'settings', 'trash'). The icon is rendered before the text.
   *
   * @param v Method value
   */
  icon(v: string): this {
    this._icon = v;
    return this;
  }

  /**
   * A callback function that fires when the button is clicked.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      text: this._text,
      variant: this._variant,
      icon: this._icon
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

/**
 * IconButton (Icon button)
 *
 * A square icon-only button (no text). Requires a label (aria-label) for accessibility.
 *
 * @example
 * // Icon buttons
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .spacing(8)
 *     .child(IconButton("play").label("Watch").size("lg").accent(true).onClick(() => ui.showHUD("success", "Start")))
 *     .child(IconButton("heart").label("Add to favorites").size("md").onClick(() => ui.showHUD("info", "Added")))
 * );
 */
export class IconButtonBuilder extends UIComponent {
  private _icon: string;
  private _label?: string;
  private _accent?: boolean;
  private _size?: "sm" | "md" | "lg";
  private _onClick?: CallbackFunction;

  constructor(icon: string) {
    super("IconButton");
    this._icon = icon;
  }

  /**
   * The aria-label text (accessibility and tooltip).
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Highlight with the accent color on hover.
   *
   * @param v Method value
   * @default false
   */
  accent(v: boolean): this { this._accent = v; return this; }
  /**
   * The button size.
   *
   * @param v Method value
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }
  /**
   * Click callback.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { icon: this._icon, label: this._label, accent: this._accent, size: this._size };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

/**
 * Chip (Chip/tag)
 *
 * A compact toggleable pill element. Suitable for filters, genres, and quick actions.
 *
 * @example
 * // Filter chips
 * const { ui, createState } = PotokSDK;
 * const state = createState({ genre: "all" });
 *
 * function draw() {
 *   ui.render(
 *     HStack().spacing(8).children(
 *       [
 *         { id: "all", label: "All", icon: "layers" },
 *         { id: "drama", label: "Drama", icon: "drama" },
 *         { id: "comedy", label: "Comedy", icon: "laugh" }
 *       ].map((g) =>
 *         Chip(g.label).icon(g.icon).active(state.genre === g.id).onClick(() => state.genre = g.id)
 *       )
 *     )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class ChipBuilder extends UIComponent {
  private _text: string;
  private _active?: boolean;
  private _icon?: string;
  private _onClick?: CallbackFunction;

  constructor(text: string) {
    super("Chip");
    this._text = text;
  }

  /**
   * The active (selected) state.
   *
   * @param v Method value
   * @default false
   */
  active(v: boolean): this { this._active = v; return this; }
  /**
   * The Lucide icon name before the text.
   *
   * @param v Method value
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * Callback for a click on the chip.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, active: this._active, icon: this._icon };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

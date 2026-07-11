import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Dropdown (Dropdown menu)
 *
 * A trigger button with a dropdown list of options. Opening/closing is managed by the component itself; selecting an item returns its id.
 *
 * @example
 * // Dropdown sorting
 * const { ui, createState } = PotokSDK;
 * const state = createState({ sort: "new" });
 *
 * function draw() {
 *   ui.render(
 *     Dropdown()
 *       .label("Sort")
 *       .icon("arrow-up-down")
 *       .value(state.sort)
 *       .items([
 *         { id: "new", label: "Newest first", icon: "clock" },
 *         { id: "rating", label: "By rating", icon: "star" },
 *         { id: "az", label: "Alphabetical" }
 *       ])
 *       .onSelect((id) => state.sort = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class DropdownBuilder extends UIComponent {
  private _label?: string;
  private _icon?: string;
  private _items: unknown[];
  private _value?: string;
  private _onSelect?: CallbackFunction;

  constructor() {
    super("Dropdown");
    this._items = [];
  }

  /**
   * The default text of the trigger button.
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * The Lucide icon name in the trigger.
   *
   * @param v Method value
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * The menu items.
   *
   * @param v Method value
   * @default []
   */
  items(v: { id: string; label: string; icon?: string }[]): this { this._items = v; return this; }
  /**
   * The identifier of the selected item.
   *
   * @param v Method value
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Item selection callback. Passes the id.
   *
   * @param v Method value
   */
  onSelect(cb: CallbackFunction): this { this._onSelect = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { label: this._label, icon: this._icon, items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onSelect) {
      json.events = { ...json.events, onSelect: CallbackRegistry.register(this._onSelect, `${path}/onSelect`) };
    }
    return json;
  }
}

/**
 * Segmented (Segmented control)
 *
 * A compact switcher of several connected segments. Controlled by the value; an alternative to Tabs for 2–4 options.
 *
 * @example
 * // View switcher
 * const { ui, createState } = PotokSDK;
 * const state = createState({ view: "grid" });
 *
 * function draw() {
 *   ui.render(
 *     Segmented()
 *       .items([
 *         { id: "grid", label: "Grid" },
 *         { id: "list", label: "List" }
 *       ])
 *       .value(state.view)
 *       .onChange((id) => state.view = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SegmentedBuilder extends UIComponent {
  private _items: unknown[];
  private _value?: string;
  private _onChange?: CallbackFunction;

  constructor() {
    super("Segmented");
    this._items = [];
  }

  /**
   * The switcher segments.
   *
   * @param v Method value
   * @default []
   */
  items(v: { id: string; label: string }[]): this { this._items = v; return this; }
  /**
   * The identifier of the active segment.
   *
   * @param v Method value
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Change callback. Passes the segment id.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

/**
 * Tabs (Tabs)
 *
 * A horizontal tab bar for switching sections. Controlled by the value; clicking a tab invokes onChange(id), after which the plugin updates its state and re-renders.
 *
 * @example
 * // Tab switching
 * const { ui, createState } = PotokSDK;
 * const state = createState({ tab: "overview" });
 *
 * function draw() {
 *   ui.render(
 *     Tabs()
 *       .items([
 *         { id: "overview", label: "Overview", icon: "info" },
 *         { id: "episodes", label: "Episodes", icon: "list" },
 *         { id: "about", label: "About" }
 *       ])
 *       .value(state.tab)
 *       .onChange((id) => state.tab = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class TabsBuilder extends UIComponent {
  private _items: unknown[];
  private _value?: string;
  private _onChange?: CallbackFunction;

  constructor() {
    super("Tabs");
    this._items = [];
  }

  /**
   * An array of tabs: { id, label, icon? }.
   *
   * @param v Method value
   * @default []
   */
  items(v: { id: string; label: string; icon?: string }[]): this { this._items = v; return this; }
  /**
   * The identifier of the active tab.
   *
   * @param v Method value
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Tab change callback. Passes the id of the selected tab.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

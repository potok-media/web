import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Select (Dropdown list)
 *
 * A dropdown list component for selecting a single text value from a predefined array of options. Supports grouping items by category using dividers and headers.
 *
 * @example
 * // Filter settings with categories and multiple selection
 * const { ui, createState } = PotokSDK;
 * const state = createState({ activeFilters: ["1080p", "dub"] });
 *
 * function draw() {
 *   ui.render(
 *     Select("filter-select")
 *       .label("Search filters")
 *       .variant("glass")
 *       .icon("Filter")
 *       .multiple(true)
 *       .closeOnSelect(false)
 *       .resetLabel("Reset all")
 *       .resetValue([])
 *       .options([
 *         { type: "header", label: "Resolution" },
 *         { value: "2160p", label: "4K (2160p)" },
 *         { value: "1080p", label: "Full HD (1080p)" },
 *         { value: "720p", label: "HD (720p)" },
 *         { type: "divider" },
 *         { type: "header", label: "Audio" },
 *         { value: "dub", label: "Dubbed" },
 *         { value: "sub", label: "Subtitles" }
 *       ])
 *       .value(state.activeFilters)
 *       .onChange((newVals) => {
 *         state.activeFilters = newVals;
 *         ui.showHUD("success", "Selected: " + newVals.join(", "));
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SelectBuilder extends UIComponent {
  private _name: string;
  private _options: unknown[];
  private _selected: string | string[];
  private _label?: string;
  private _onChange?: CallbackFunction;
  private _variant?: string;
  private _icon?: string;
  private _closeOnSelect?: boolean;
  private _resetLabel?: string;
  private _resetValue?: string | string[];
  private _multiple?: boolean;

  constructor(n: string) {
    super("Select");
    this.id(n);
    this._name = n;
    this._options = [];
    this._selected = "";
  }

  /**
   * The list title displayed above the select field.
   *
   * @param v Method value
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * An array of available list items. Options may contain a text value and code, or act as dividers ({ type: 'divider' }) or category headers ({ type: 'header', label: 'Text' }).
   *
   * @param v Method value
   * @default []
   */
  options(opts: { label?: string; value?: string; type?: "item" | "header" | "divider" }[]): this {
    this._options = opts;
    return this;
  }

  /**
   * The currently selected value or an array of selected values in multiple selection mode (multiple).
   *
   * @param v Method value
   * @default ''
   */
  value(v: string | string[]): this {
    this._selected = v;
    return this;
  }

  /**
   * A deprecated synonym for value.
   *
   * @param v Method value
   */
  selected(v: string | string[]): this {
    return this.value(v);
  }

  /**
   * Called when a new item or items are selected from the list. Passes the selected value or an array of values in multiple selection mode (multiple).
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  /**
   * The visual style of the dropdown list. 'default' — a standard form field, 'glass' — a stylish semi-transparent button with blur (similar to the buttons in the top filter bar).
   *
   * @param v Method value
   * @default 'default'
   */
  variant(v: "default" | "glass"): this {
    this._variant = v;
    return this;
  }

  /**
   * An icon name from the Lucide library to display inside the button on the left (applies only when variant: 'glass', for example: 'Flame', 'Settings', 'Filter').
   *
   * @param v Method value
   */
  icon(v: string): this {
    this._icon = v;
    return this;
  }

  /**
   * Determines whether to close the menu when an item is selected. Defaults to true for single selection and false for multiple selection (multiple).
   *
   * @param v Method value
   * @default true
   */
  closeOnSelect(v: boolean): this {
    this._closeOnSelect = v;
    return this;
  }

  /**
   * Enables multiple selection mode. Selected values are returned as an array, and clicks on options toggle their active state without automatically closing the menu.
   *
   * @param v Method value
   * @default false
   */
  multiple(v: boolean): this {
    this._multiple = v;
    return this;
  }

  /**
   * The text of the reset button at the bottom of the popover (if set, the reset button is displayed).
   *
   * @param v Method value
   */
  resetLabel(v: string): this {
    this._resetLabel = v;
    return this;
  }

  /**
   * The value set when the reset button is pressed (for example, an empty array [] for multiple selection).
   *
   * @param v Method value
   * @default ''
   */
  resetValue(v: string | string[]): this {
    this._resetValue = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      label: this._label,
      options: this._options,
      selected: this._selected,
      variant: this._variant,
      icon: this._icon,
      closeOnSelect: this._closeOnSelect,
      multiple: this._multiple,
      resetLabel: this._resetLabel,
      resetValue: this._resetValue
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

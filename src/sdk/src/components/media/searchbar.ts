import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * SearchBar (Search bar)
 *
 * A specialized search field with a built-in magnifier icon and a quick clear button. Great for building content search systems.
 *
 * @example
 * // Search field
 * const { ui, createState } = PotokSDK;
 * const state = createState({ query: "" });
 *
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .child(
 *         SearchBar()
 *           .value(state.query)
 *           .placeholder("Enter a title...")
 *           .onChange((v) => state.query = v)
 *           .onClear(() => state.query = "")
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SearchBarBuilder extends UIComponent {
  private _value?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;
  private _onClear?: CallbackFunction;

  constructor() {
    super("SearchBar");
  }

  /**
   * The current text in the search field.
   *
   * @param v Method value
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * Input hint inside the search field.
   *
   * @param v Method value
   * @default 'Search...'
   */
  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  /**
   * Callback when the user changes the search query text.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  /**
   * Callback on a click on the "Cross" icon to reset the search field.
   *
   * @param v Method value
   */
  onClear(cb: CallbackFunction): this {
    this._onClear = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      value: this._value,
      placeholder: this._placeholder
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    if (this._onClear) {
      json.events = { ...json.events, onClear: CallbackRegistry.register(this._onClear, `${path}/onClear`) };
    }
    return json;
  }
}

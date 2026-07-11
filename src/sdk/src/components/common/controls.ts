import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Range (Slider)
 *
 * A slider for selecting a numeric value in the range [min, max] with a step and an optional display of the current value.
 *
 * @example
 * // Volume slider
 * const { ui, createState } = PotokSDK;
 * const state = createState({ volume: 50 });
 *
 * function draw() {
 *   ui.render(
 *     Range("volume")
 *       .label("Volume")
 *       .min(0)
 *       .max(100)
 *       .step(1)
 *       .value(state.volume)
 *       .showValue(true)
 *       .onChange((v) => state.volume = v)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class RangeBuilder extends UIComponent {
  private _name: string;
  private _value: number;
  private _min?: number;
  private _max?: number;
  private _step?: number;
  private _label?: string;
  private _showValue?: boolean;
  private _onChange?: CallbackFunction;

  constructor(name: string) {
    super("Range");
    this.id(name);
    this._name = name;
    this._value = 0;
  }

  /**
   * The current value.
   *
   * @param v Method value
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * The minimum value of the range.
   *
   * @param v Method value
   */
  min(v: number): this { this._min = v; return this; }
  /**
   * The maximum value of the range.
   *
   * @param v Method value
   */
  max(v: number): this { this._max = v; return this; }
  /**
   * The step of value change.
   *
   * @param v Method value
   */
  step(v: number): this { this._step = v; return this; }
  /**
   * The label above the slider.
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Show the current value to the right of the label.
   *
   * @param v Method value
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }
  /**
   * Change callback. Passes a number.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      value: this._value,
      min: this._min,
      max: this._max,
      step: this._step,
      label: this._label,
      showValue: this._showValue
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

/**
 * CodeEditor (Code editor)
 *
 * A built-in full-featured code editor based on Monaco. Supports syntax highlighting, autocompletion, line numbers, and code formatting.
 *
 * @example
 * // Monaco code editor
 * const { ui, createState } = PotokSDK;
 * const state = createState({ code: "console.log('Hello, world!');" });
 *
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .child(
 *         CodeEditor("js-editor")
 *           .label("Script editor")
 *           .value(state.code)
 *           .readOnly(false)
 *           .onChange((v) => state.code = v)
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class CodeEditorBuilder extends UIComponent {
  private _name: string;
  private _value: string;
  private _label?: string;
  private _readOnly?: boolean;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("CodeEditor");
    this.id(n);
    this._name = n;
    this._value = "";
  }

  /**
   * The heading/label above the editor container.
   *
   * @param v Method value
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * The initial or current text in the editor.
   *
   * @param v Method value
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * The edit lock flag. When true, the editor switches to view mode.
   *
   * @param v Method value
   * @default false
   */
  readOnly(v: boolean): this {
    this._readOnly = v;
    return this;
  }

  /**
   * Fires on any change to the source code in the editor window.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      label: this._label,
      value: this._value,
      readOnly: this._readOnly
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

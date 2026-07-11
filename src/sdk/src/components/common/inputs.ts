import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Input (Input field)
 *
 * A text input field for filling in form data, server addresses, authorization keys, or filters.
 *
 * @example
 * // Form data input
 * const { ui, createState } = PotokSDK;
 *
 * const state = createState({ username: "", password: "" });
 *
 * function draw() {
 *   ui.render(
 *     Card()
 *       .title("Authorization")
 *       .child(
 *         VStack()
 *           .spacing(12)
 *           .child(
 *             Input("login")
 *               .label("Username")
 *               .placeholder("Enter email")
 *               .value(state.username)
 *               .onChange((v) => state.username = v)
 *           )
 *           .child(
 *             Input("password")
 *               .label("Password")
 *               .placeholder("••••••••")
 *               .inputType("password")
 *               .value(state.password)
 *               .onChange((v) => state.password = v)
 *           )
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class InputBuilder extends UIComponent {
  private _name: string;
  private _inputType: string;
  private _value: string;
  private _label?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("Input");
    this.id(n);
    this._name = n;
    this._inputType = 'text';
    this._value = "";
  }

  /**
   * The title (label) displayed directly above the input field.
   *
   * @param v Method value
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * The placeholder text displayed inside an empty input field.
   *
   * @param v Method value
   */
  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  /**
   * Sets the type of input data. Changes the field behavior and masks input for 'password'.
   *
   * @param v Method value
   * @default 'text'
   */
  inputType(v: string): this {
    this._inputType = v;
    return this;
  }

  /**
   * A deprecated synonym for inputType.
   *
   * @param v Method value
   */
  type(v: string): this {
    return this.inputType(v);
  }

  /**
   * The current text value of the field.
   *
   * @param v Method value
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * A text input handler invoked on every change of the value.
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
      placeholder: this._placeholder,
      inputType: this._inputType,
      value: this._value
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
 * Toggle (Toggle)
 *
 * An interactive toggle (checkbox/switch) for enabling/disabling boolean configuration options.
 *
 * @example
 * // Settings toggle
 * const { ui, createState } = PotokSDK;
 * const state = createState({ autoplay: false });
 *
 * function draw() {
 *   ui.render(
 *     Toggle("autoplay-toggle")
 *       .label("Autoplay")
 *       .description("Play the next episode automatically")
 *       .value(state.autoplay)
 *       .onChange((v) => {
 *         state.autoplay = v;
 *         ui.showHUD("info", "Autoplay: " + (v ? "ON" : "OFF"));
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class ToggleBuilder extends UIComponent {
  private _name: string;
  private _checked: boolean;
  private _label?: string;
  private _description?: string;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("Toggle");
    this.id(n);
    this._name = n;
    this._checked = false;
  }

  /**
   * The text label displayed to the right of the toggle.
   *
   * @param v Method value
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * An additional description (small font text) displayed below the toggle label.
   *
   * @param v Method value
   */
  description(v: string): this {
    this._description = v;
    return this;
  }

  /**
   * The current boolean state of the toggle (true / false).
   *
   * @param v Method value
   * @default false
   */
  value(v: boolean): this {
    this._checked = v;
    return this;
  }

  /**
   * A deprecated synonym for value.
   *
   * @param v Method value
   */
  checked(v: boolean): this {
    return this.value(v);
  }

  /**
   * A click handler that returns the new boolean state of the switch.
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
      description: this._description,
      checked: this._checked
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

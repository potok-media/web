import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * ProgressBar (Progress bar)
 *
 * A horizontal progress indicator (0..1) with an optional label and percentage.
 *
 * @example
 * // Progress bars
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(ProgressBar().value(0.35).label("Loading").showValue(true))
 *     .child(ProgressBar().value(0.8).variant("success"))
 * );
 */
export class ProgressBarBuilder extends UIComponent {
  private _value: number;
  private _variant?: string;
  private _label?: string;
  private _showValue?: boolean;

  constructor() {
    super("ProgressBar");
    this._value = 0;
  }

  /**
   * The progress value from 0 to 1.
   *
   * @param v Method value
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * The color of the progress bar.
   *
   * @param v Method value
   * @default 'accent'
   */
  variant(v: "accent" | "success" | "warning" | "error"): this { this._variant = v; return this; }
  /**
   * The label above the bar.
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Show the percentage on the right.
   *
   * @param v Method value
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { value: this._value, variant: this._variant, label: this._label, showValue: this._showValue };
  }
}

/**
 * Skeleton (Loading placeholder)
 *
 * A generic shimmering placeholder of arbitrary size. Useful for custom loading states.
 *
 * @example
 * // Loading placeholders
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Skeleton().height(24).width("60%"))
 *     .child(Skeleton().height(120).rounded("0.75rem"))
 *     .child(Skeleton().height(16).count(3))
 * );
 */
export class SkeletonBuilder extends UIComponent {
  private _rounded?: boolean | string;
  private _count?: number;

  constructor() {
    super("Skeleton");
  }

  /**
   * Corner rounding: true or a CSS value.
   *
   * @param v Method value
   */
  rounded(v: boolean | string): this { this._rounded = v; return this; }
  /**
   * The number of repeated placeholder rows.
   *
   * @param v Method value
   * @default 1
   */
  count(v: number): this { this._count = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { rounded: this._rounded, count: this._count };
  }
}

/**
 * EmptyState (Empty state)
 *
 * A placeholder for empty lists and screens: an icon, title, description, and an optional action button.
 *
 * @example
 * // Empty state
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   EmptyState()
 *     .icon("inbox")
 *     .title("Nothing here yet")
 *     .description("Add the first item to get started.")
 *     .actionLabel("Add")
 *     .onAction(() => ui.showHUD("info", "Creating..."))
 * );
 */
export class EmptyStateBuilder extends UIComponent {
  private _icon?: string;
  private _title?: string;
  private _description?: string;
  private _actionLabel?: string;
  private _onAction?: CallbackFunction;

  constructor() {
    super("EmptyState");
  }

  /**
   * The Lucide icon name in the center of the placeholder.
   *
   * @param v Method value
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * The placeholder title.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * An explanatory description.
   *
   * @param v Method value
   */
  description(v: string): this { this._description = v; return this; }
  /**
   * The action button text (the button appears only if set).
   *
   * @param v Method value
   */
  actionLabel(v: string): this { this._actionLabel = v; return this; }
  /**
   * Callback for a click on the action button.
   *
   * @param v Method value
   */
  onAction(cb: CallbackFunction): this { this._onAction = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { icon: this._icon, title: this._title, description: this._description, actionLabel: this._actionLabel };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = { ...json.events, onAction: CallbackRegistry.register(this._onAction, `${path}/onAction`) };
    }
    return json;
  }
}

/**
 * FileInput (File picker)
 *
 * A file picker field with a type filter. onChange receives { names, count } — the names and count of selected files.
 *
 * @example
 * // Poster upload
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   FileInput("poster")
 *     .label("Upload poster")
 *     .accept("image/*")
 *     .multiple(false)
 *     .onChange((info) => ui.showHUD("info", "Files selected: " + info.count))
 * );
 */
export class FileInputBuilder extends UIComponent {
  private _name: string;
  private _label?: string;
  private _accept?: string;
  private _multiple?: boolean;
  private _onChange?: CallbackFunction;

  constructor(name: string) {
    super("FileInput");
    this.id(name);
    this._name = name;
  }

  /**
   * The label above the field.
   *
   * @param v Method value
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * The file type filter (for example, 'image/*').
   *
   * @param v Method value
   */
  accept(v: string): this { this._accept = v; return this; }
  /**
   * Allow selecting multiple files.
   *
   * @param v Method value
   * @default false
   */
  multiple(v: boolean): this { this._multiple = v; return this; }
  /**
   * Selection callback. Receives { names: string[], count }.
   *
   * @param v Method value
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { name: this._name, label: this._label, accept: this._accept, multiple: this._multiple };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

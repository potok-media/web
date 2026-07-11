import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Badge (Badge)
 *
 * A compact rounded label with a colored background. Suitable for showing video quality, subscription statuses, "New" labels, and other tags.
 *
 * @example
 * // Badges
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .spacing(8)
 *     .child(Badge("FullHD").color("info"))
 *     .child(Badge("New").color("success"))
 *     .child(Badge("Popular").color("warning"))
 *     .child(Badge("18+").color("error"))
 * );
 */
export class BadgeBuilder extends UIComponent {
  private _text: string;
  private _color: string;

  constructor(t: string) {
    super("Badge");
    this._text = t;
    this._color = 'info';
  }

  /**
   * The fill color scheme of the badge.
   *
   * @param v Method value
   * @default 'info'
   */
  color(v: string): this {
    this._color = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      text: this._text,
      color: this._color
    };
  }
}

/**
 * StatusRow (Status row)
 *
 * A component for displaying the state of external systems or connections with a colored indicator (dot) and a text value.
 *
 * @example
 * // Status rows
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Card()
 *     .title("System status")
 *     .child(
 *       VStack()
 *         .spacing(8)
 *         .child(StatusRow("Primary server (BFF)").status("success").value("Active (18ms)"))
 *         .child(StatusRow("Local proxy server").status("warning").value("Timeout (450ms)"))
 *         .child(StatusRow("Backup mirror").status("offline").value("Unavailable"))
 *     )
 * );
 */
export class StatusRowBuilder extends UIComponent {
  private _label: string;
  private _status?: string;
  private _value?: string;

  constructor(label: string) {
    super("StatusRow");
    this._label = label;
  }

  /**
   * The status state (changes the dot color: green/yellow/gray respectively).
   *
   * @param v Method value
   */
  status(v: string): this {
    this._status = v;
    return this;
  }

  /**
   * The text value aligned to the right edge of the row (for example, '24 ms' or 'v1.2.0').
   *
   * @param v Method value
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      label: this._label,
      status: this._status,
      value: this._value
    };
  }
}

/**
 * SectionHeader (Section header)
 *
 * A page section header with an optional subtitle and action button ("Show all").
 *
 * @example
 * // Section header
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   SectionHeader("Continue watching")
 *     .subtitle("12 movies and shows")
 *     .actionLabel("Show all")
 *     .onAction(() => ui.showHUD("info", "All section items"))
 * );
 */
export class SectionHeaderBuilder extends UIComponent {
  private _title: string;
  private _subtitle?: string;
  private _actionLabel?: string;
  private _onAction?: CallbackFunction;

  constructor(title: string) {
    super("SectionHeader");
    this._title = title;
  }

  /**
   * The subtitle below the main heading.
   *
   * @param v Method value
   */
  subtitle(v: string): this { this._subtitle = v; return this; }
  /**
   * The text of the action button on the right (the button appears only if onAction is set).
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
    return { title: this._title, subtitle: this._subtitle, actionLabel: this._actionLabel };
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
 * Alert (Inline notification)
 *
 * A colored notification banner (info/success/warning/error) with an icon, title, and text.
 *
 * @example
 * // Notifications
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Alert("Connection established").variant("success").icon("check-circle"))
 *     .child(Alert("Check the server settings").variant("warning").title("Warning").icon("alert-triangle"))
 * );
 */
export class AlertBuilder extends UIComponent {
  private _text: string;
  private _title?: string;
  private _variant?: string;
  private _icon?: string;

  constructor(text: string) {
    super("Alert");
    this._text = text;
  }

  /**
   * The notification title.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * The color scheme of the notification.
   *
   * @param v Method value
   * @default 'info'
   */
  variant(v: "info" | "success" | "warning" | "error"): this { this._variant = v; return this; }
  /**
   * The Lucide icon name (by default chosen based on variant).
   *
   * @param v Method value
   */
  icon(v: string): this { this._icon = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, title: this._title, variant: this._variant, icon: this._icon };
  }
}

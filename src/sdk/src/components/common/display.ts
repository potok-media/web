import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Image (Image)
 *
 * A responsive image with lazy loading and a fallback image on error. Lets a plugin display arbitrary images, not just through MediaCard.
 *
 * @example
 * // Image with aspect ratio and rounding
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Image("https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
 *     .alt("Poster")
 *     .aspectRatio("2/3")
 *     .rounded(true)
 *     .fit("cover")
 *     .fallback("https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg")
 *     .width("12rem")
 *     .onClick(() => ui.showHUD("info", "Image clicked"))
 * );
 */
export class ImageBuilder extends UIComponent {
  private _src: string;
  private _alt?: string;
  private _aspectRatio?: string;
  private _fallback?: string;
  private _rounded?: boolean | string;
  private _fit?: "cover" | "contain";
  private _onClick?: CallbackFunction;

  constructor(src: string) {
    super("Image");
    this._src = src;
  }

  /**
   * The alternative text of the image.
   *
   * @param v Method value
   */
  alt(v: string): this { this._alt = v; return this; }
  /**
   * The aspect ratio of the frame (for example, '16/9' or '2/3').
   *
   * @param v Method value
   */
  aspectRatio(v: string): this { this._aspectRatio = v; return this; }
  /**
   * The URL of the fallback image shown on a load error.
   *
   * @param v Method value
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * Corner rounding: true for the standard radius or a CSS value.
   *
   * @param v Method value
   */
  rounded(v: boolean | string): this { this._rounded = v; return this; }
  /**
   * The mode for fitting the image into the frame.
   *
   * @param v Method value
   * @default 'cover'
   */
  fit(v: "cover" | "contain"): this { this._fit = v; return this; }
  /**
   * Callback for a click on the image.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return {
      src: this._src,
      alt: this._alt,
      aspectRatio: this._aspectRatio,
      fallback: this._fallback,
      rounded: this._rounded,
      fit: this._fit
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
 * Icon (Icon)
 *
 * A single icon from the Lucide collection (for example, 'play', 'heart', 'settings').
 *
 * @example
 * // Icon set
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .child(Icon("heart").color("#ff4d4f"))
 *     .child(Icon("star").size("1.5rem").color("#faad14"))
 *     .child(Icon("settings"))
 * );
 */
export class IconBuilder extends UIComponent {
  private _name: string;
  private _size?: string | number;
  private _color?: string;

  constructor(name: string) {
    super("Icon");
    this._name = name;
  }

  /**
   * The icon size (for example, '1.5rem' or 24).
   *
   * @param v Method value
   */
  size(v: string | number): this { this._size = v; return this; }
  /**
   * The icon color (CSS color).
   *
   * @param v Method value
   */
  color(v: string): this { this._color = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { name: this._name, size: this._size, color: this._color };
  }
}

/**
 * List (Row list)
 *
 * A vertical list of clickable rows with an icon, title, subtitle, badge, and trailing icon.
 *
 * @example
 * // Menu item list
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   List()
 *     .items([
 *       { id: "a", title: "Settings", subtitle: "General options", icon: "settings", trailingIcon: "chevron-right" },
 *       { id: "b", title: "Account", badge: "PRO", icon: "user", trailingIcon: "chevron-right" }
 *     ])
 *     .onItemClick((item) => ui.showHUD("info", "Selected: " + item.title))
 * );
 */
export class ListBuilder extends UIComponent {
  private _items: unknown[];
  private _onItemClick?: CallbackFunction;

  constructor() {
    super("List");
    this._items = [];
  }

  /**
   * An array of rows: { id, title, subtitle?, icon?, badge?, trailingIcon?, disabled? }.
   *
   * @param v Method value
   * @default []
   */
  items(v: { id: string; title: string; subtitle?: string; icon?: string; badge?: string; trailingIcon?: string; disabled?: boolean }[]): this { this._items = v; return this; }
  /**
   * Callback for a click on a row. Passes the row object.
   *
   * @param v Method value
   */
  onItemClick(cb: CallbackFunction): this { this._onItemClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onItemClick) {
      json.events = { ...json.events, onItemClick: CallbackRegistry.register(this._onItemClick, `${path}/onItemClick`) };
    }
    return json;
  }
}

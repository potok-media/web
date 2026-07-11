import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Avatar (Avatar)
 *
 * A round or square user/actor image with lazy loading. When no image is available, it shows the initials from the name.
 *
 * @example
 * // Avatars
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .alignItems("center")
 *     .children([
 *       Avatar("https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg")
 *         .name("Matthew McConaughey")
 *         .size("lg")
 *         .shape("circle"),
 *       Avatar("")
 *         .name("Anne Hathaway")
 *         .size("md")
 *         .shape("square")
 *         .fallback("https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg")
 *     ])
 * );
 */
export class AvatarBuilder extends UIComponent {
  private _src: string;
  private _name?: string;
  private _size?: "sm" | "md" | "lg";
  private _fallback?: string;
  private _shape?: "circle" | "square";

  constructor(src: string) {
    super("Avatar");
    this._src = src;
  }

  /**
   * The name: initials for the fallback and alt text.
   *
   * @param v Method value
   */
  name(v: string): this { this._name = v; return this; }
  /**
   * The avatar size.
   *
   * @param v Method value
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }
  /**
   * The URL of the fallback image on a load error.
   *
   * @param v Method value
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * The avatar shape.
   *
   * @param v Method value
   * @default 'circle'
   */
  shape(v: "circle" | "square"): this { this._shape = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { src: this._src, name: this._name, size: this._size, fallback: this._fallback, shape: this._shape };
  }
}

/**
 * Rating (Star rating)
 *
 * A row of stars displaying a score from 0 to max with support for half stars and an optional numeric value.
 *
 * @example
 * // Ratings
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .children([
 *       Rating().value(4.5).max(5).showValue(true).size("md"),
 *       Rating().value(3).max(5).size("sm")
 *     ])
 * );
 */
export class RatingBuilder extends UIComponent {
  private _value: number;
  private _max?: number;
  private _showValue?: boolean;
  private _size?: "sm" | "md" | "lg";

  constructor() {
    super("Rating");
    this._value = 0;
  }

  /**
   * The rating value (supports fractional values for half stars).
   *
   * @param v Method value
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * The maximum number of stars.
   *
   * @param v Method value
   * @default 5
   */
  max(v: number): this { this._max = v; return this; }
  /**
   * Show the numeric value on the right.
   *
   * @param v Method value
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }
  /**
   * The star size.
   *
   * @param v Method value
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { value: this._value, max: this._max, showValue: this._showValue, size: this._size };
  }
}

/**
 * TagList (Tag list)
 *
 * A set of tags/genres as pills. Static by default; they become clickable when onTagClick is set.
 *
 * @example
 * // Genre tags
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   TagList()
 *     .tags(["Fantasy", "Drama", { id: "action", label: "Action" }])
 *     .onTagClick((id) => ui.showHUD("info", "Tag: " + id))
 * );
 */
export class TagListBuilder extends UIComponent {
  private _tags: unknown[];
  private _onTagClick?: CallbackFunction;

  constructor() {
    super("TagList");
    this._tags = [];
  }

  /**
   * An array of tags: strings or objects { id?, label }.
   *
   * @param v Method value
   * @default []
   */
  tags(v: (string | { id?: string; label: string })[]): this { this._tags = v; return this; }
  /**
   * Callback for a click on a tag. Passes the id (or string).
   *
   * @param v Method value
   */
  onTagClick(cb: CallbackFunction): this { this._onTagClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { tags: this._tags };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onTagClick) {
      json.events = { ...json.events, onTagClick: CallbackRegistry.register(this._onTagClick, `${path}/onTagClick`) };
    }
    return json;
  }
}

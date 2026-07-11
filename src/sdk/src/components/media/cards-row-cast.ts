import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard, SDKCastMember } from "../../types";

/**
 * MediaCast (Cast)
 *
 * A horizontal row with cards of the movie's creators or cast. Renders round photos (avatars), the actors' real names and their role names.
 *
 * @example
 * // Cast
 * const { ui } = PotokSDK;
 *
 * // The actor's photo is read from profileSrc (per the SDKCastMember shape), not from profilePath.
 * const actors = [
 *   {
 *     name: "Matthew McConaughey",
 *     character: "Cooper",
 *     profileSrc: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
 *   },
 *   {
 *     name: "Anne Hathaway",
 *     character: "Amelia Brand",
 *     profileSrc: "https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg"
 *   }
 * ];
 *
 * ui.render(
 *   MediaCast()
 *     .cast(actors)
 * );
 */
export class MediaCastBuilder extends UIComponent {
  private _cast: unknown[];

  constructor() {
    super("MediaCast");
    this._cast = [];
  }

  /**
   * Array of actor objects (name, character, profilePath).
   *
   * @param v Method value
   * @default []
   */
  cast(v: SDKCastMember[]): this {
    this._cast = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      cast: this._cast
    };
  }
}

/**
 * MediaRow (Horizontal row)
 *
 * A horizontally scrollable carousel for displaying a list of MediaCard cards. Equipped with a shared title and a "Show all" button.
 *
 * @example
 * // Media carousel
 * const { ui } = PotokSDK;
 *
 * const movies = [
 *   { id: 157336, title: "Interstellar", subtitle: "2014", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg", tmdbRating: 8.4 },
 *   { id: 335984, title: "Blade Runner 2049", subtitle: "2017", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg", kpRating: 7.9 },
 *   { id: 27205, title: "Inception", subtitle: "2010", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", imdbRating: 8.8 }
 * ];
 *
 * ui.render(
 *   MediaRow()
 *     .title("Recommended movies")
 *     .items(movies)
 *     .onCardClick((item) => {
 *       ui.showHUD("info", "Click: " + item.title);
 *     })
 *     .onSeeAllClick(() => {
 *       ui.showHUD("success", "Show all!");
 *     })
 * );
 */
export class MediaRowBuilder extends UIComponent {
  private _rowId?: string;
  private _title?: string;
  private _items: unknown[];
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("MediaRow");
    this._items = [];
  }

  override id(v: string): this {
    super.id(v);
    this._rowId = v;
    return this;
  }

  /**
   * Title for the row section (for example, 'Now watching').
   *
   * @param v Method value
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Array of movie objects to display in the row as cards.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKMediaCard[]): this {
    this._items = v;
    return this;
  }

  /**
   * Callback on a click on any movie card in the row.
   *
   * @param v Method value
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Callback on a click on the "Show all" / "See all" button.
   *
   * @param v Method value
   */
  onSeeAllClick(cb: CallbackFunction): this {
    this._onSeeAllClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      id: this._rowId,
      title: this._title,
      items: this._items
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onSeeAllClick) {
      json.events = { ...json.events, onSeeAllClick: CallbackRegistry.register(this._onSeeAllClick, `${path}/onSeeAllClick`) };
    }
    return json;
  }
}

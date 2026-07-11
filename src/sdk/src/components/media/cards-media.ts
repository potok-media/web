import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard } from "../../types";

/**
 * MediaCard (Movie card)
 *
 * A vertical media card. Displays the poster, rating (Kinopoisk/IMDb) and overlays the title and release year on hover.
 *
 * @example
 * // Media card
 * const { ui } = PotokSDK;
 *
 * // SDKMediaCard shape: id + mediaType are required for navigation, ratings and poster use the names posterSrc/tmdbRating.
 * const movie = {
 *   id: 157336,
 *   title: "Interstellar",
 *   subtitle: "Interstellar (2014)",
 *   mediaType: "movie",
 *   posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *   genres: "Sci-Fi, Drama",
 *   ageRating: "12+",
 *   tmdbRating: 8.4,
 *   kpRating: 8.6,
 *   imdbRating: 8.7,
 *   progress: { percentage: 45 }
 * };
 *
 * ui.render(
 *   MediaCard()
 *     .item(movie)
 *     .onClick((item) => {
 *       ui.showHUD("success", "You selected: " + item.title);
 *     })
 * );
 */
export class MediaCardBuilder extends UIComponent {
  private _item: unknown;
  private _onClick?: CallbackFunction;

  constructor() {
    super("MediaCard");
    this._item = {};
  }

  /**
   * Object with movie metadata (title, posterUrl, year, rating).
   *
   * @param v Method value
   */
  item(v: SDKMediaCard): this {
    this._item = v;
    return this;
  }

  /**
   * Callback handler for a click on the card. Passes the media object.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item };
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
 * HeroSpotlight (Promo banner)
 *
 * A huge promotional banner for the plugin's home page. Renders a high-resolution background image (art), a title, a description and provides interactive "Watch" and "Details" buttons.
 *
 * @example
 * // Promo banner
 * const { ui } = PotokSDK;
 *
 * // The background comes from backdropSrc (required, otherwise the banner will not render); id + mediaType are needed for the "Details" navigation.
 * const promo = {
 *   id: 335984,
 *   title: "Blade Runner 2049",
 *   mediaType: "movie",
 *   overview: "In the new age, replicants do the dirtiest work...",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *   genres: "Sci-Fi, Drama",
 *   tmdbRating: 8.0
 * };
 *
 * ui.render(
 *   HeroSpotlight()
 *     .items([promo])
 *     .onPlay((item) => ui.showHUD("success", "Watching " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Opening " + item.title))
 * );
 */
export class HeroSpotlightBuilder extends UIComponent {
  private _items: unknown[];
  private _onPlay?: CallbackFunction;
  private _onDetails?: CallbackFunction;

  constructor() {
    super("HeroSpotlight");
    this._items = [];
  }

  /**
   * Array of media items for the banner slider (title, overview, backdropUrl).
   *
   * @param v Method value
   */
  items(v: SDKMediaCard[]): this {
    this._items = v;
    return this;
  }

  /**
   * Handler for a click on the main "Watch" button. Returns the active slide object.
   *
   * @param v Method value
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Handler for a click on the additional "Details" button.
   *
   * @param v Method value
   */
  onDetails(cb: CallbackFunction): this {
    this._onDetails = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onPlay) {
      json.events = { ...json.events, onPlay: CallbackRegistry.register(this._onPlay, `${path}/onPlay`) };
    }
    if (this._onDetails) {
      json.events = { ...json.events, onDetails: CallbackRegistry.register(this._onDetails, `${path}/onDetails`) };
    }
    return json;
  }
}

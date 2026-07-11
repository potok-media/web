import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

/**
 * ContentCard (Generic card)
 *
 * A content card that is NOT tied to the TMDB shape. Draws the poster, badges, progress bar and title from your own data model (SDKContentItem: id, title, subtitle, image, wideImage, badges, meta, progress, rank).
 *
 * @example
 * // Card from your own data
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   ContentCard()
 *     .item({
 *       id: "track-1",
 *       title: "Nightcall",
 *       subtitle: "Kavinsky",
 *       image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg",
 *       badges: [{ text: "NEW", color: "accent" }],
 *       meta: ["2010", "Synthwave"],
 *       progress: 0.4,
 *       rank: 1
 *     })
 *     .orientation("portrait")
 *     .onClick((item) => ui.showHUD("info", "Opened: " + item.title))
 * );
 */
export class ContentCardBuilder extends UIComponent {
  private _item: unknown;
  private _orientation?: "portrait" | "landscape";
  private _onClick?: CallbackFunction;

  constructor() {
    super("ContentCard");
    this._item = {};
  }

  /**
   * Content object: id, title, subtitle, image, wideImage, badges, meta, progress, rank, href.
   *
   * @param v Method value
   */
  item(v: SDKContentItem): this {
    this._item = v;
    return this;
  }

  /**
   * Card orientation: vertical poster or wide still.
   *
   * @param v Method value
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Callback on a click on the card. Passes the content object.
   *
   * @param v Method value
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item, orientation: this._orientation };
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
 * ContentRow (Generic carousel)
 *
 * A horizontal row of ContentCard cards from your own data model (SDKContentItem[]). A generalized version of MediaRow without TMDB coupling: section title, "Show all" button and D-pad scrolling.
 *
 * @example
 * // Category row from your own data
 * const { ui } = PotokSDK;
 *
 * const items = [
 *   { id: "1", title: "Item 1", image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg" },
 *   { id: "2", title: "Item 2", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 *
 * ui.render(
 *   ContentRow()
 *     .title("My selection")
 *     .items(items)
 *     .orientation("portrait")
 *     .seeAllLabel("All")
 *     .onCardClick((item) => ui.showHUD("info", "Click: " + item.title))
 *     .onSeeAllClick(() => ui.showHUD("success", "Show all"))
 * );
 */
export class ContentRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _orientation?: "portrait" | "landscape";
  private _seeAllLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("ContentRow");
    this._items = [];
  }

  /**
   * Row section title.
   *
   * @param v Method value
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Array of content for the row cards.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKContentItem[]): this {
    this._items = v;
    return this;
  }

  /**
   * Orientation of the row cards.
   *
   * @param v Method value
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Text of the "Show all" button (the button appears only if onSeeAllClick is set).
   *
   * @param v Method value
   */
  seeAllLabel(v: string): this {
    this._seeAllLabel = v;
    return this;
  }

  /**
   * Callback on a click on any card in the row.
   *
   * @param v Method value
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Callback on a click on the "Show all" button.
   *
   * @param v Method value
   */
  onSeeAllClick(cb: CallbackFunction): this {
    this._onSeeAllClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      title: this._title,
      items: this._items,
      orientation: this._orientation,
      seeAllLabel: this._seeAllLabel
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

import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

// ---------------------------------------------------------------------------
// Phase 2 batch 2 — content rows/grids/hero (SDKContentItem-based). Authored bare;
// scripts/document-sdk.js injects canonical JSDoc from componentsMetadata.
// ---------------------------------------------------------------------------

/**
 * ContinueWatchingRow (Continue watching)
 *
 * A horizontal row of wide cards with a progress bar — the "Continue watching" section from your data model (SDKContentItem[], progress field 0..1).
 *
 * @example
 * // "Continue watching" row
 * const { ui } = PotokSDK;
 *
 * const items = [
 *   { id: "1", title: "Dune: Part Two", subtitle: "2024", wideImage: "https://image.tmdb.org/t/p/w780/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg", progress: 0.6 },
 *   { id: "2", title: "Interstellar", subtitle: "2014", wideImage: "https://image.tmdb.org/t/p/w780/il8gr7YStcrui1EM2crk14G4HjL.jpg", progress: 0.25 }
 * ];
 *
 * ui.render(
 *   ContinueWatchingRow()
 *     .title("Continue watching")
 *     .items(items)
 *     .onCardClick((item) => ui.showHUD("info", "Continuing: " + item.title))
 * );
 */
export class ContinueWatchingRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _onCardClick?: CallbackFunction;

  constructor() {
    super("ContinueWatchingRow");
    this._items = [];
  }

  /**
   * Row title.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Items with a progress field (0..1) for the progress bar.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKContentItem[]): this { this._items = v; return this; }
  /**
   * Callback on a click on a card.
   *
   * @param v Method value
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    return json;
  }
}

/**
 * TopTenRow (Top 10)
 *
 * A ranked row with a large position number next to each poster. The number comes from the rank field or from the item's position (up to 10).
 *
 * @example
 * // Ranked "Top 10" row
 * const { ui } = PotokSDK;
 *
 * const items = [
 *   { id: "1", title: "Movie 1", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" },
 *   { id: "2", title: "Movie 2", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Movie 3", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 *
 * ui.render(
 *   TopTenRow()
 *     .title("Top 10 today")
 *     .items(items)
 *     .onCardClick((item) => ui.showHUD("info", item.title))
 * );
 */
export class TopTenRowBuilder extends UIComponent {
  private _title?: string;
  private _items: unknown[];
  private _seeAllLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onSeeAllClick?: CallbackFunction;

  constructor() {
    super("TopTenRow");
    this._items = [];
  }

  /**
   * Row title.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Up to 10 items; the number comes from the rank field or the position.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKContentItem[]): this { this._items = v; return this; }
  /**
   * Text of the "Show all" button in the header (appears only if onSeeAllClick is set).
   *
   * @param v Method value
   */
  seeAllLabel(v: string): this { this._seeAllLabel = v; return this; }
  /**
   * Callback on a click on a card.
   *
   * @param v Method value
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }
  /**
   * Callback on a click on the header/"Show all".
   *
   * @param v Method value
   */
  onSeeAllClick(cb: CallbackFunction): this { this._onSeeAllClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, items: this._items, seeAllLabel: this._seeAllLabel };
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

/**
 * PosterGrid (Poster grid)
 *
 * A responsive grid of poster cards with an optional load-more button (infinite list) — for catalog/category pages from your data model.
 *
 * @example
 * // Poster grid with load-more
 * const { ui } = PotokSDK;
 *
 * const items = [
 *   { id: "1", title: "Dune", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
 *   { id: "2", title: "Inception", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Interstellar", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" }
 * ];
 *
 * ui.render(
 *   PosterGrid()
 *     .items(items)
 *     .minWidth("10rem")
 *     .loadMoreLabel("Show more")
 *     .onCardClick((item) => ui.showHUD("info", item.title))
 *     .onLoadMore(() => ui.showHUD("info", "Loading the next page..."))
 * );
 */
export class PosterGridBuilder extends UIComponent {
  private _items: unknown[];
  private _minWidth?: string;
  private _loadMoreLabel?: string;
  private _onCardClick?: CallbackFunction;
  private _onLoadMore?: CallbackFunction;

  constructor() {
    super("PosterGrid");
    this._items = [];
  }

  /**
   * Grid cards.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKContentItem[]): this { this._items = v; return this; }
  /**
   * Minimum column width.
   *
   * @param v Method value
   * @default '10rem'
   */
  minWidth(v: string): this { this._minWidth = v; return this; }
  /**
   * Text of the load-more button (appears only if onLoadMore is set).
   *
   * @param v Method value
   */
  loadMoreLabel(v: string): this { this._loadMoreLabel = v; return this; }
  /**
   * Callback on a click on a card.
   *
   * @param v Method value
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }
  /**
   * Callback to load the next page.
   *
   * @param v Method value
   */
  onLoadMore(cb: CallbackFunction): this { this._onLoadMore = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, minWidth: this._minWidth, loadMoreLabel: this._loadMoreLabel };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onCardClick) {
      json.events = { ...json.events, onCardClick: CallbackRegistry.register(this._onCardClick, `${path}/onCardClick`) };
    }
    if (this._onLoadMore) {
      json.events = { ...json.events, onLoadMore: CallbackRegistry.register(this._onLoadMore, `${path}/onLoadMore`) };
    }
    return json;
  }
}

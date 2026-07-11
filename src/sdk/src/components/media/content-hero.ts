import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

/**
 * Hero (Generic promo banner)
 *
 * A wide promo banner from your own data model (SDKContentItem[]). A generalized version of HeroSpotlight without TMDB coupling: wideImage background, logo/title, metadata, badges and "Watch" / "Details" buttons.
 *
 * @example
 * // Promo from your own data
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Hero()
 *     .items([{
 *       id: "feature-1",
 *       title: "My content",
 *       subtitle: "Description of the featured item, shown over the background.",
 *       wideImage: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *       meta: ["2024", "Drama", "2h 15m"],
 *       badges: [{ text: "4K", color: "info" }]
 *     }])
 *     .playLabel("Watch")
 *     .detailsLabel("Details")
 *     .onPlay((item) => ui.showHUD("success", "Watching: " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Details: " + item.title))
 * );
 */
export class HeroBuilder extends UIComponent {
  private _items: unknown[];
  private _playLabel?: string;
  private _detailsLabel?: string;
  private _onPlay?: CallbackFunction;
  private _onDetails?: CallbackFunction;

  constructor() {
    super("Hero");
    this._items = [];
  }

  /**
   * Array of featured items. The first item is rendered.
   *
   * @param v Method value
   * @default []
   */
  items(v: SDKContentItem[]): this {
    this._items = v;
    return this;
  }

  /**
   * Text of the main button.
   *
   * @param v Method value
   * @default 'Watch'
   */
  playLabel(v: string): this {
    this._playLabel = v;
    return this;
  }

  /**
   * Text of the additional button.
   *
   * @param v Method value
   * @default 'Details'
   */
  detailsLabel(v: string): this {
    this._detailsLabel = v;
    return this;
  }

  /**
   * Callback on a click on the main button. Passes the active item.
   *
   * @param v Method value
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Callback on a click on the "Details" button.
   *
   * @param v Method value
   */
  onDetails(cb: CallbackFunction): this {
    this._onDetails = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      items: this._items,
      playLabel: this._playLabel,
      detailsLabel: this._detailsLabel
    };
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

/**
 * DetailHero (Detail-page hero)
 *
 * A large detail-page banner: background, logo/title, metadata, badges and customizable action buttons. A click on a button returns its id.
 *
 * @example
 * // Detail-page hero
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   DetailHero()
 *     .item({
 *       id: "1",
 *       title: "Dune: Part Two",
 *       subtitle: "Paul Atreides unites with Chani and the Fremen...",
 *       wideImage: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *       meta: ["2024", "Sci-Fi", "2h 46m"],
 *       badges: [{ text: "4K", color: "info" }]
 *     })
 *     .actions([
 *       { id: "play", label: "Watch", icon: "play" },
 *       { id: "trailer", label: "Trailer", icon: "film", variant: "ghost" }
 *     ])
 *     .onAction((actionId) => ui.showHUD("success", "Action: " + actionId))
 * );
 */
export class DetailHeroBuilder extends UIComponent {
  private _item: unknown;
  private _actions: unknown[];
  private _onAction?: CallbackFunction;

  constructor() {
    super("DetailHero");
    this._item = {};
    this._actions = [];
  }

  /**
   * Featured item: wideImage/logo/title/subtitle/meta/badges.
   *
   * @param v Method value
   */
  item(v: SDKContentItem): this { this._item = v; return this; }
  /**
   * Action buttons. variant: 'ghost' — transparent.
   *
   * @param v Method value
   * @default []
   */
  actions(v: { id: string; label: string; icon?: string; variant?: string }[]): this { this._actions = v; return this; }
  /**
   * Callback on a click on a button. Passes the action id.
   *
   * @param v Method value
   */
  onAction(cb: CallbackFunction): this { this._onAction = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { item: this._item, actions: this._actions };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = { ...json.events, onAction: CallbackRegistry.register(this._onAction, `${path}/onAction`) };
    }
    return json;
  }
}

import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

// ---------------------------------------------------------------------------
// Phase 2 batch 2 — content rows/grids/hero (SDKContentItem-based). Authored bare;
// scripts/document-sdk.js injects canonical JSDoc from componentsMetadata.
// ---------------------------------------------------------------------------

/**
 * ContinueWatchingRow (Продолжить просмотр)
 * 
 * Горизонтальный ряд широких карточек с полосой прогресса — раздел «Продолжить просмотр» из вашей модели данных (SDKContentItem[], поле progress 0..1).
 * 
 * @example
 * // Ряд «Продолжить просмотр»
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Дюна: Часть вторая", subtitle: "2024", wideImage: "https://image.tmdb.org/t/p/w780/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg", progress: 0.6 },
 *   { id: "2", title: "Интерстеллар", subtitle: "2014", wideImage: "https://image.tmdb.org/t/p/w780/il8gr7YStcrui1EM2crk14G4HjL.jpg", progress: 0.25 }
 * ];
 * 
 * ui.render(
 *   ContinueWatchingRow()
 *     .title("Продолжить просмотр")
 *     .items(items)
 *     .onCardClick((item) => ui.showHUD("info", "Продолжаем: " + item.title))
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
   * Заголовок ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Элементы с полем progress (0..1) для полосы прогресса.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: SDKContentItem[]): this { this._items = v; return this; }
  /**
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
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
 * TopTenRow (Топ-10)
 * 
 * Ранжированный ряд с крупным номером позиции у каждого постера. Номер берётся из поля rank или из позиции элемента (до 10).
 * 
 * @example
 * // Ранжированный ряд «Топ-10»
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Фильм 1", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" },
 *   { id: "2", title: "Фильм 2", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Фильм 3", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 * 
 * ui.render(
 *   TopTenRow()
 *     .title("Топ-10 сегодня")
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
   * Заголовок ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * До 10 элементов; номер — из поля rank или позиции.
   *
   * @param v Значение метода
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
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
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
 * PosterGrid (Сетка постеров)
 * 
 * Адаптивная сетка карточек-постеров с необязательной кнопкой догрузки (бесконечный список) — для страниц каталога/категории из вашей модели данных.
 * 
 * @example
 * // Сетка постеров с догрузкой
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Дюна", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
 *   { id: "2", title: "Начало", image: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg" },
 *   { id: "3", title: "Интерстеллар", image: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg" }
 * ];
 * 
 * ui.render(
 *   PosterGrid()
 *     .items(items)
 *     .minWidth("10rem")
 *     .loadMoreLabel("Показать ещё")
 *     .onCardClick((item) => ui.showHUD("info", item.title))
 *     .onLoadMore(() => ui.showHUD("info", "Загрузка следующей страницы..."))
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
   * Карточки сетки.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: SDKContentItem[]): this { this._items = v; return this; }
  /**
   * Минимальная ширина колонки.
   *
   * @param v Значение метода
   * @default '10rem'
   */
  minWidth(v: string): this { this._minWidth = v; return this; }
  /**
   * Текст кнопки догрузки (появляется только если задан onLoadMore).
   *
   * @param v Значение метода
   */
  loadMoreLabel(v: string): this { this._loadMoreLabel = v; return this; }
  /**
   * Коллбек клика по карточке.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this { this._onCardClick = cb; return this; }
  /**
   * Коллбек догрузки следующей страницы.
   *
   * @param v Значение метода
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

import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

/**
 * ContentCard (Универсальная карточка)
 * 
 * Карточка контента, НЕ привязанная к форме TMDB. Рисует постер, бейджи, полосу прогресса и заголовок из вашей собственной модели данных (SDKContentItem: id, title, subtitle, image, wideImage, badges, meta, progress, rank).
 * 
 * @example
 * // Карточка из своих данных
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
 *     .onClick((item) => ui.showHUD("info", "Открыто: " + item.title))
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
   * Объект контента: id, title, subtitle, image, wideImage, badges, meta, progress, rank, href.
   *
   * @param v Значение метода
   */
  item(v: SDKContentItem): this {
    this._item = v;
    return this;
  }

  /**
   * Ориентация карточки: вертикальный постер или широкий кадр.
   *
   * @param v Значение метода
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Коллбек клика по карточке. Передаёт объект контента.
   *
   * @param v Значение метода
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
 * ContentRow (Универсальная карусель)
 * 
 * Горизонтальный ряд карточек ContentCard из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия MediaRow без привязки к TMDB: заголовок секции, кнопка «Показать все» и D-pad-скролл.
 * 
 * @example
 * // Ряд категории из своих данных
 * const { ui } = PotokSDK;
 * 
 * const items = [
 *   { id: "1", title: "Элемент 1", image: "https://image.tmdb.org/t/p/w500/9O1Iy9od7uEuw6Bs4POV62Zzg2H.jpg" },
 *   { id: "2", title: "Элемент 2", image: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" }
 * ];
 * 
 * ui.render(
 *   ContentRow()
 *     .title("Моя подборка")
 *     .items(items)
 *     .orientation("portrait")
 *     .seeAllLabel("Все")
 *     .onCardClick((item) => ui.showHUD("info", "Клик: " + item.title))
 *     .onSeeAllClick(() => ui.showHUD("success", "Показать все"))
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
   * Заголовок секции ряда.
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Массив контента для карточек ряда.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: SDKContentItem[]): this {
    this._items = v;
    return this;
  }

  /**
   * Ориентация карточек ряда.
   *
   * @param v Значение метода
   * @default 'portrait'
   */
  orientation(v: "portrait" | "landscape"): this {
    this._orientation = v;
    return this;
  }

  /**
   * Текст кнопки «Показать все» (кнопка появляется только если задан onSeeAllClick).
   *
   * @param v Значение метода
   */
  seeAllLabel(v: string): this {
    this._seeAllLabel = v;
    return this;
  }

  /**
   * Коллбек клика по любой карточке ряда.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Коллбек клика по кнопке «Показать все».
   *
   * @param v Значение метода
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

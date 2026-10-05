import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKContentItem } from "../../types";

/**
 * Hero (Универсальный промо-баннер)
 * 
 * Широкий промо-баннер из вашей собственной модели данных (SDKContentItem[]). Обобщённая версия HeroSpotlight без привязки к TMDB: фон wideImage, логотип/заголовок, метаданные, бейджи и кнопки «Смотреть» / «Подробнее».
 * 
 * @example
 * // Промо из своих данных
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Hero()
 *     .items([{
 *       id: "feature-1",
 *       title: "Мой контент",
 *       subtitle: "Описание featured-элемента, которое видно поверх фона.",
 *       wideImage: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *       meta: ["2024", "Драма", "2ч 15м"],
 *       badges: [{ text: "4K", color: "info" }]
 *     }])
 *     .playLabel("Смотреть")
 *     .detailsLabel("Подробнее")
 *     .onPlay((item) => ui.showHUD("success", "Смотрим: " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Подробнее: " + item.title))
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
   * Массив featured-элементов. Отрисовывается первый элемент.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: SDKContentItem[]): this {
    this._items = v;
    return this;
  }

  /**
   * Текст главной кнопки.
   *
   * @param v Значение метода
   * @default 'Смотреть'
   */
  playLabel(v: string): this {
    this._playLabel = v;
    return this;
  }

  /**
   * Текст дополнительной кнопки.
   *
   * @param v Значение метода
   * @default 'Подробнее'
   */
  detailsLabel(v: string): this {
    this._detailsLabel = v;
    return this;
  }

  /**
   * Коллбек клика по главной кнопке. Передаёт активный элемент.
   *
   * @param v Значение метода
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Коллбек клика по кнопке «Подробнее».
   *
   * @param v Значение метода
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
 * DetailHero (Hero детальной страницы)
 * 
 * Крупный баннер детальной страницы: фон, логотип/заголовок, метаданные, бейджи и настраиваемые кнопки действий. Клик по кнопке возвращает её id.
 * 
 * @example
 * // Hero детальной страницы
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   DetailHero()
 *     .item({
 *       id: "1",
 *       title: "Дюна: Часть вторая",
 *       subtitle: "Пол Атрейдес объединяется с Чани и фрименами...",
 *       wideImage: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *       meta: ["2024", "Фантастика", "2ч 46м"],
 *       badges: [{ text: "4K", color: "info" }]
 *     })
 *     .actions([
 *       { id: "play", label: "Смотреть", icon: "play" },
 *       { id: "trailer", label: "Трейлер", icon: "film", variant: "ghost" }
 *     ])
 *     .onAction((actionId) => ui.showHUD("success", "Действие: " + actionId))
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
   * Featured-элемент: wideImage/logo/title/subtitle/meta/badges.
   *
   * @param v Значение метода
   */
  item(v: SDKContentItem): this { this._item = v; return this; }
  /**
   * Кнопки действий. variant: 'ghost' — прозрачная.
   *
   * @param v Значение метода
   * @default []
   */
  actions(v: { id: string; label: string; icon?: string; variant?: string }[]): this { this._actions = v; return this; }
  /**
   * Коллбек клика по кнопке. Передаёт id действия.
   *
   * @param v Значение метода
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

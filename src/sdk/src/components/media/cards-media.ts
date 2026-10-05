import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard } from "../../types";

/**
 * MediaCard (Карточка фильма)
 * 
 * Вертикальная карточка медиаресурса. Отображает постер, рейтинг (Кинопоиск/IMDb) и накладывает название и год выпуска при наведении курсора.
 * 
 * @example
 * // Карточка медиа
 * const { ui } = PotokSDK;
 * 
 * // Форма SDKMediaCard: id + mediaType обязательны для перехода, рейтинги и постер — по именам posterSrc/tmdbRating.
 * const movie = {
 *   id: 157336,
 *   title: "Интерстеллар",
 *   subtitle: "Interstellar (2014)",
 *   mediaType: "movie",
 *   posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/xu9zaAevzQ5nnrsXN6JcahLnG4i.jpg",
 *   genres: "Фантастика, Драма",
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
 *       ui.showHUD("success", "Вы выбрали: " + item.title);
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
   * Объект с метаданными фильма (title, posterUrl, year, rating).
   *
   * @param v Значение метода
   */
  item(v: SDKMediaCard): this {
    this._item = v;
    return this;
  }

  /**
   * Коллбек-обработчик клика по карточке. Передает объект медиа.
   *
   * @param v Значение метода
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
 * HeroSpotlight (Промо-баннер)
 * 
 * Огромный рекламный промо-баннер для главной страницы плагина. Выводит фоновое изображение (арт) высокого разрешения, заголовок, описание и предоставляет интерактивные кнопки «Смотреть» и «Подробнее».
 * 
 * @example
 * // Промо баннер
 * const { ui } = PotokSDK;
 * 
 * // Фон берётся из backdropSrc (обязателен, иначе баннер не отрисуется); id + mediaType нужны для перехода «Подробнее».
 * const promo = {
 *   id: 335984,
 *   title: "Бегущий по лезвию 2049",
 *   mediaType: "movie",
 *   overview: "В новый век репликанты выполняют самую грязную работу...",
 *   backdropSrc: "https://image.tmdb.org/t/p/original/il8gr7YStcrui1EM2crk14G4HjL.jpg",
 *   genres: "Фантастика, Драма",
 *   tmdbRating: 8.0
 * };
 * 
 * ui.render(
 *   HeroSpotlight()
 *     .items([promo])
 *     .onPlay((item) => ui.showHUD("success", "Смотрим " + item.title))
 *     .onDetails((item) => ui.showHUD("info", "Открываем " + item.title))
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
   * Массив медиа-элементов для слайдера баннера (title, overview, backdropUrl).
   *
   * @param v Значение метода
   */
  items(v: SDKMediaCard[]): this {
    this._items = v;
    return this;
  }

  /**
   * Обработчик клика по главной кнопке «Смотреть». Возвращает активный объект слайда.
   *
   * @param v Значение метода
   */
  onPlay(cb: CallbackFunction): this {
    this._onPlay = cb;
    return this;
  }

  /**
   * Обработчик клика по дополнительной кнопке «Подробнее».
   *
   * @param v Значение метода
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

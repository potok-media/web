import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";
import type { SDKMediaCard, SDKCastMember } from "../../types";

/**
 * MediaCast (Актерский состав)
 * 
 * Горизонтальный ряд с карточками создателей фильма или актерского состава. Выводит круглые фотографии (аватары), реальные имена актеров и названия их ролей.
 * 
 * @example
 * // Актерский состав
 * const { ui } = PotokSDK;
 * 
 * // Фото актёра читается из profileSrc (по форме SDKCastMember), не из profilePath.
 * const actors = [
 *   {
 *     name: "Мэттью Макконахи",
 *     character: "Купер",
 *     profileSrc: "https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg"
 *   },
 *   {
 *     name: "Энн Хэтэуэй",
 *     character: "Амелия Брэнд",
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
   * Массив объектов актеров (name, character, profilePath).
   *
   * @param v Значение метода
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
 * MediaRow (Горизонтальный ряд)
 * 
 * Карусель с горизонтальной прокруткой для отображения списка карточек MediaCard. Снабжена общим заголовком и кнопкой «Показать все».
 * 
 * @example
 * // Карусель медиа
 * const { ui } = PotokSDK;
 * 
 * const movies = [
 *   { id: 157336, title: "Интерстеллар", subtitle: "2014", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg", tmdbRating: 8.4 },
 *   { id: 335984, title: "Бегущий по лезвию 2049", subtitle: "2017", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg", kpRating: 7.9 },
 *   { id: 27205, title: "Начало", subtitle: "2010", mediaType: "movie", posterSrc: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", imdbRating: 8.8 }
 * ];
 * 
 * ui.render(
 *   MediaRow()
 *     .title("Рекомендуемые фильмы")
 *     .items(movies)
 *     .onCardClick((item) => {
 *       ui.showHUD("info", "Клик: " + item.title);
 *     })
 *     .onSeeAllClick(() => {
 *       ui.showHUD("success", "Показать все!");
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
   * Заголовок для секции ряда (например, 'Сейчас смотрят').
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Массив объектов фильмов для отображения в ряду в виде карточек.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: SDKMediaCard[]): this {
    this._items = v;
    return this;
  }

  /**
   * Коллбек при клике на любую карточку фильма в ряду.
   *
   * @param v Значение метода
   */
  onCardClick(cb: CallbackFunction): this {
    this._onCardClick = cb;
    return this;
  }

  /**
   * Коллбек при клике на кнопку «Показать все» / «Смотреть все».
   *
   * @param v Значение метода
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

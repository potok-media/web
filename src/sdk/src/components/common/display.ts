import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Image (Изображение)
 * 
 * Адаптивное изображение с ленивой загрузкой и запасной картинкой (fallback) при ошибке. Позволяет плагину выводить произвольные картинки, а не только через MediaCard.
 * 
 * @example
 * // Изображение с соотношением сторон и скруглением
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Image("https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
 *     .alt("Постер")
 *     .aspectRatio("2/3")
 *     .rounded(true)
 *     .fit("cover")
 *     .fallback("https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg")
 *     .width("12rem")
 *     .onClick(() => ui.showHUD("info", "Клик по изображению"))
 * );
 */
export class ImageBuilder extends UIComponent {
  private _src: string;
  private _alt?: string;
  private _aspectRatio?: string;
  private _fallback?: string;
  private _rounded?: boolean | string;
  private _fit?: "cover" | "contain";
  private _onClick?: CallbackFunction;

  constructor(src: string) {
    super("Image");
    this._src = src;
  }

  /**
   * Альтернативный текст изображения.
   *
   * @param v Значение метода
   */
  alt(v: string): this { this._alt = v; return this; }
  /**
   * Соотношение сторон рамки (например, '16/9' или '2/3').
   *
   * @param v Значение метода
   */
  aspectRatio(v: string): this { this._aspectRatio = v; return this; }
  /**
   * URL запасного изображения, показываемого при ошибке загрузки.
   *
   * @param v Значение метода
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * Скругление углов: true для стандартного радиуса или CSS-значение.
   *
   * @param v Значение метода
   */
  rounded(v: boolean | string): this { this._rounded = v; return this; }
  /**
   * Режим вписывания изображения в рамку.
   *
   * @param v Значение метода
   * @default 'cover'
   */
  fit(v: "cover" | "contain"): this { this._fit = v; return this; }
  /**
   * Коллбек клика по изображению.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return {
      src: this._src,
      alt: this._alt,
      aspectRatio: this._aspectRatio,
      fallback: this._fallback,
      rounded: this._rounded,
      fit: this._fit
    };
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
 * Icon (Иконка)
 * 
 * Отдельная иконка из коллекции Lucide (например, 'play', 'heart', 'settings').
 * 
 * @example
 * // Набор иконок
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .child(Icon("heart").color("#ff4d4f"))
 *     .child(Icon("star").size("1.5rem").color("#faad14"))
 *     .child(Icon("settings"))
 * );
 */
export class IconBuilder extends UIComponent {
  private _name: string;
  private _size?: string | number;
  private _color?: string;

  constructor(name: string) {
    super("Icon");
    this._name = name;
  }

  /**
   * Размер иконки (например, '1.5rem' или 24).
   *
   * @param v Значение метода
   */
  size(v: string | number): this { this._size = v; return this; }
  /**
   * Цвет иконки (CSS-цвет).
   *
   * @param v Значение метода
   */
  color(v: string): this { this._color = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { name: this._name, size: this._size, color: this._color };
  }
}

/**
 * List (Список строк)
 * 
 * Вертикальный список кликабельных строк с иконкой, заголовком, подзаголовком, бейджем и завершающей иконкой.
 * 
 * @example
 * // Список пунктов меню
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   List()
 *     .items([
 *       { id: "a", title: "Настройки", subtitle: "Общие параметры", icon: "settings", trailingIcon: "chevron-right" },
 *       { id: "b", title: "Аккаунт", badge: "PRO", icon: "user", trailingIcon: "chevron-right" }
 *     ])
 *     .onItemClick((item) => ui.showHUD("info", "Выбрано: " + item.title))
 * );
 */
export class ListBuilder extends UIComponent {
  private _items: unknown[];
  private _onItemClick?: CallbackFunction;

  constructor() {
    super("List");
    this._items = [];
  }

  /**
   * Массив строк: { id, title, subtitle?, icon?, badge?, trailingIcon?, disabled? }.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: { id: string; title: string; subtitle?: string; icon?: string; badge?: string; trailingIcon?: string; disabled?: boolean }[]): this { this._items = v; return this; }
  /**
   * Коллбек клика по строке. Передаёт объект строки.
   *
   * @param v Значение метода
   */
  onItemClick(cb: CallbackFunction): this { this._onItemClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onItemClick) {
      json.events = { ...json.events, onItemClick: CallbackRegistry.register(this._onItemClick, `${path}/onItemClick`) };
    }
    return json;
  }
}

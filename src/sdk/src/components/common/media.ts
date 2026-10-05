import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Avatar (Аватар)
 * 
 * Круглое или квадратное изображение пользователя/актёра с ленивой загрузкой. При отсутствии картинки показывает инициалы из имени.
 * 
 * @example
 * // Аватары
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .alignItems("center")
 *     .children([
 *       Avatar("https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg")
 *         .name("Мэттью Макконахи")
 *         .size("lg")
 *         .shape("circle"),
 *       Avatar("")
 *         .name("Энн Хэтэуэй")
 *         .size("md")
 *         .shape("square")
 *         .fallback("https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg")
 *     ])
 * );
 */
export class AvatarBuilder extends UIComponent {
  private _src: string;
  private _name?: string;
  private _size?: "sm" | "md" | "lg";
  private _fallback?: string;
  private _shape?: "circle" | "square";

  constructor(src: string) {
    super("Avatar");
    this._src = src;
  }

  /**
   * Имя: инициалы для запасного варианта и alt-текст.
   *
   * @param v Значение метода
   */
  name(v: string): this { this._name = v; return this; }
  /**
   * Размер аватара.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }
  /**
   * URL запасного изображения при ошибке загрузки.
   *
   * @param v Значение метода
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * Форма аватара.
   *
   * @param v Значение метода
   * @default 'circle'
   */
  shape(v: "circle" | "square"): this { this._shape = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { src: this._src, name: this._name, size: this._size, fallback: this._fallback, shape: this._shape };
  }
}

/**
 * Rating (Рейтинг звёздами)
 * 
 * Строка звёзд, отображающая оценку от 0 до max с поддержкой половинных звёзд и необязательным числовым значением.
 * 
 * @example
 * // Рейтинги
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .children([
 *       Rating().value(4.5).max(5).showValue(true).size("md"),
 *       Rating().value(3).max(5).size("sm")
 *     ])
 * );
 */
export class RatingBuilder extends UIComponent {
  private _value: number;
  private _max?: number;
  private _showValue?: boolean;
  private _size?: "sm" | "md" | "lg";

  constructor() {
    super("Rating");
    this._value = 0;
  }

  /**
   * Значение рейтинга (поддерживает дробное для половинных звёзд).
   *
   * @param v Значение метода
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * Максимальное число звёзд.
   *
   * @param v Значение метода
   * @default 5
   */
  max(v: number): this { this._max = v; return this; }
  /**
   * Показывать числовое значение справа.
   *
   * @param v Значение метода
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }
  /**
   * Размер звёзд.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { value: this._value, max: this._max, showValue: this._showValue, size: this._size };
  }
}

/**
 * TagList (Список тегов)
 * 
 * Набор тегов/жанров в виде пилюль. Статичные по умолчанию; при заданном onTagClick становятся кликабельными.
 * 
 * @example
 * // Жанры-теги
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   TagList()
 *     .tags(["Фэнтези", "Драма", { id: "action", label: "Боевик" }])
 *     .onTagClick((id) => ui.showHUD("info", "Тег: " + id))
 * );
 */
export class TagListBuilder extends UIComponent {
  private _tags: unknown[];
  private _onTagClick?: CallbackFunction;

  constructor() {
    super("TagList");
    this._tags = [];
  }

  /**
   * Массив тегов: строки или объекты { id?, label }.
   *
   * @param v Значение метода
   * @default []
   */
  tags(v: (string | { id?: string; label: string })[]): this { this._tags = v; return this; }
  /**
   * Коллбек клика по тегу. Передаёт id (или строку).
   *
   * @param v Значение метода
   */
  onTagClick(cb: CallbackFunction): this { this._onTagClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { tags: this._tags };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onTagClick) {
      json.events = { ...json.events, onTagClick: CallbackRegistry.register(this._onTagClick, `${path}/onTagClick`) };
    }
    return json;
  }
}

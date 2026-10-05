import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Button (Кнопка)
 * 
 * Интерактивный элемент интерфейса для выполнения различных действий, запуска воспроизведения или переходов по страницам.
 * 
 * @example
 * // Кнопки управления
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Card()
 *     .title("Управление плеером")
 *     .child(
 *       HStack()
 *         .spacing(10)
 *         .child(Button("Смотреть").variant("primary").icon("play").onClick(() => ui.showHUD("success", "Воспроизведение...")))
 *         .child(Button("Настройки").variant("secondary").icon("settings").onClick(() => ui.showHUD("info", "Открываем настройки...")))
 *         .child(Button("Удалить").variant("danger").icon("trash").onClick(() => ui.showHUD("error", "Элемент удален")))
 *     )
 * );
 */
export class ButtonBuilder extends UIComponent {
  private _text: string;
  private _variant: string;
  private _icon?: string;
  private _onClick?: CallbackFunction;

  constructor(t: string) {
    super("Button");
    this._text = t;
    this._variant = 'secondary';
  }

  /**
   * Визуальный стиль кнопки (основной цвет акцента, нейтральный серый, красный предупреждающий, прозрачный фон или стиль элемента бокового меню).
   *
   * @param v Значение метода
   * @default 'secondary'
   */
  variant(v: string): this {
    this._variant = v;
    return this;
  }

  /**
   * Имя иконки из коллекции Lucide (например, 'play', 'settings', 'trash'). Иконка отрисовывается перед текстом.
   *
   * @param v Значение метода
   */
  icon(v: string): this {
    this._icon = v;
    return this;
  }

  /**
   * Коллбек-функция обратного вызова, срабатывающая при клике на кнопку.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this {
    this._onClick = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      text: this._text,
      variant: this._variant,
      icon: this._icon
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
 * IconButton (Кнопка-иконка)
 * 
 * Квадратная кнопка только с иконкой (без текста). Требует label (aria-label) для доступности.
 * 
 * @example
 * // Кнопки-иконки
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(8)
 *     .child(IconButton("play").label("Смотреть").size("lg").accent(true).onClick(() => ui.showHUD("success", "Пуск")))
 *     .child(IconButton("heart").label("В избранное").size("md").onClick(() => ui.showHUD("info", "Добавлено")))
 * );
 */
export class IconButtonBuilder extends UIComponent {
  private _icon: string;
  private _label?: string;
  private _accent?: boolean;
  private _size?: "sm" | "md" | "lg";
  private _onClick?: CallbackFunction;

  constructor(icon: string) {
    super("IconButton");
    this._icon = icon;
  }

  /**
   * Текст aria-label (доступность и подсказка).
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Подсвечивать акцентным цветом при наведении.
   *
   * @param v Значение метода
   * @default false
   */
  accent(v: boolean): this { this._accent = v; return this; }
  /**
   * Размер кнопки.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }
  /**
   * Коллбек клика.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { icon: this._icon, label: this._label, accent: this._accent, size: this._size };
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
 * Chip (Чип/тег)
 * 
 * Компактный переключаемый элемент-пилюля. Подходит для фильтров, жанров и быстрых действий.
 * 
 * @example
 * // Чипы-фильтры
 * const { ui, createState } = PotokSDK;
 * const state = createState({ genre: "all" });
 * 
 * function draw() {
 *   ui.render(
 *     HStack().spacing(8).children(
 *       [
 *         { id: "all", label: "Все", icon: "layers" },
 *         { id: "drama", label: "Драма", icon: "drama" },
 *         { id: "comedy", label: "Комедия", icon: "laugh" }
 *       ].map((g) =>
 *         Chip(g.label).icon(g.icon).active(state.genre === g.id).onClick(() => state.genre = g.id)
 *       )
 *     )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class ChipBuilder extends UIComponent {
  private _text: string;
  private _active?: boolean;
  private _icon?: string;
  private _onClick?: CallbackFunction;

  constructor(text: string) {
    super("Chip");
    this._text = text;
  }

  /**
   * Активное (выбранное) состояние.
   *
   * @param v Значение метода
   * @default false
   */
  active(v: boolean): this { this._active = v; return this; }
  /**
   * Имя иконки Lucide перед текстом.
   *
   * @param v Значение метода
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * Коллбек клика по чипу.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, active: this._active, icon: this._icon };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = { ...json.events, onClick: CallbackRegistry.register(this._onClick, `${path}/onClick`) };
    }
    return json;
  }
}

import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Dropdown (Выпадающее меню)
 * 
 * Кнопка-триггер с выпадающим списком вариантов. Открытие/закрытие управляется самим компонентом; выбор пункта возвращает его id.
 * 
 * @example
 * // Выпадающая сортировка
 * const { ui, createState } = PotokSDK;
 * const state = createState({ sort: "new" });
 * 
 * function draw() {
 *   ui.render(
 *     Dropdown()
 *       .label("Сортировка")
 *       .icon("arrow-up-down")
 *       .value(state.sort)
 *       .items([
 *         { id: "new", label: "Сначала новые", icon: "clock" },
 *         { id: "rating", label: "По рейтингу", icon: "star" },
 *         { id: "az", label: "По алфавиту" }
 *       ])
 *       .onSelect((id) => state.sort = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class DropdownBuilder extends UIComponent {
  private _label?: string;
  private _icon?: string;
  private _items: unknown[];
  private _value?: string;
  private _onSelect?: CallbackFunction;

  constructor() {
    super("Dropdown");
    this._items = [];
  }

  /**
   * Текст кнопки-триггера по умолчанию.
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Имя иконки Lucide в триггере.
   *
   * @param v Значение метода
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * Пункты меню.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: { id: string; label: string; icon?: string }[]): this { this._items = v; return this; }
  /**
   * Идентификатор выбранного пункта.
   *
   * @param v Значение метода
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Коллбек выбора пункта. Передаёт id.
   *
   * @param v Значение метода
   */
  onSelect(cb: CallbackFunction): this { this._onSelect = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { label: this._label, icon: this._icon, items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onSelect) {
      json.events = { ...json.events, onSelect: CallbackRegistry.register(this._onSelect, `${path}/onSelect`) };
    }
    return json;
  }
}

/**
 * Segmented (Сегмент-контрол)
 * 
 * Компактный переключатель из нескольких соединённых сегментов. Управляется значением value; альтернатива Tabs для 2–4 вариантов.
 * 
 * @example
 * // Переключатель вида
 * const { ui, createState } = PotokSDK;
 * const state = createState({ view: "grid" });
 * 
 * function draw() {
 *   ui.render(
 *     Segmented()
 *       .items([
 *         { id: "grid", label: "Сетка" },
 *         { id: "list", label: "Список" }
 *       ])
 *       .value(state.view)
 *       .onChange((id) => state.view = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SegmentedBuilder extends UIComponent {
  private _items: unknown[];
  private _value?: string;
  private _onChange?: CallbackFunction;

  constructor() {
    super("Segmented");
    this._items = [];
  }

  /**
   * Сегменты переключателя.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: { id: string; label: string }[]): this { this._items = v; return this; }
  /**
   * Идентификатор активного сегмента.
   *
   * @param v Значение метода
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Коллбек смены. Передаёт id сегмента.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

/**
 * Tabs (Вкладки)
 * 
 * Горизонтальный таб-бар для переключения секций. Управляется значением value; клик по вкладке вызывает onChange(id), после чего плагин обновляет своё состояние и перерисовывается.
 * 
 * @example
 * // Переключение вкладок
 * const { ui, createState } = PotokSDK;
 * const state = createState({ tab: "overview" });
 * 
 * function draw() {
 *   ui.render(
 *     Tabs()
 *       .items([
 *         { id: "overview", label: "Обзор", icon: "info" },
 *         { id: "episodes", label: "Серии", icon: "list" },
 *         { id: "about", label: "О проекте" }
 *       ])
 *       .value(state.tab)
 *       .onChange((id) => state.tab = id)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class TabsBuilder extends UIComponent {
  private _items: unknown[];
  private _value?: string;
  private _onChange?: CallbackFunction;

  constructor() {
    super("Tabs");
    this._items = [];
  }

  /**
   * Массив вкладок: { id, label, icon? }.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: { id: string; label: string; icon?: string }[]): this { this._items = v; return this; }
  /**
   * Идентификатор активной вкладки.
   *
   * @param v Значение метода
   */
  value(v: string): this { this._value = v; return this; }
  /**
   * Коллбек смены вкладки. Передаёт id выбранной вкладки.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { items: this._items, value: this._value };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

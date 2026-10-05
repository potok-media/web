import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Select (Выпадающий список)
 * 
 * Компонент выпадающего списка (Dropdown) для выбора одного текстового значения из предопределенного массива вариантов. Поддерживает группировку элементов по категориям при помощи разделителей и заголовков.
 * 
 * @example
 * // Настройки фильтрации с категориями и множественным выбором
 * const { ui, createState } = PotokSDK;
 * const state = createState({ activeFilters: ["1080p", "dub"] });
 * 
 * function draw() {
 *   ui.render(
 *     Select("filter-select")
 *       .label("Фильтры поиска")
 *       .variant("glass")
 *       .icon("Filter")
 *       .multiple(true)
 *       .closeOnSelect(false)
 *       .resetLabel("Сбросить всё")
 *       .resetValue([])
 *       .options([
 *         { type: "header", label: "Разрешение" },
 *         { value: "2160p", label: "4K (2160p)" },
 *         { value: "1080p", label: "Full HD (1080p)" },
 *         { value: "720p", label: "HD (720p)" },
 *         { type: "divider" },
 *         { type: "header", label: "Озвучка" },
 *         { value: "dub", label: "Дубляж" },
 *         { value: "sub", label: "Субтитры" }
 *       ])
 *       .value(state.activeFilters)
 *       .onChange((newVals) => {
 *         state.activeFilters = newVals;
 *         ui.showHUD("success", "Выбрано: " + newVals.join(", "));
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SelectBuilder extends UIComponent {
  private _name: string;
  private _options: unknown[];
  private _selected: string | string[];
  private _label?: string;
  private _onChange?: CallbackFunction;
  private _variant?: string;
  private _icon?: string;
  private _closeOnSelect?: boolean;
  private _resetLabel?: string;
  private _resetValue?: string | string[];
  private _multiple?: boolean;

  constructor(n: string) {
    super("Select");
    this.id(n);
    this._name = n;
    this._options = [];
    this._selected = "";
  }

  /**
   * Заголовок списка, выводимый над полем выбора.
   *
   * @param v Значение метода
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * Массив доступных элементов списка. Опции могут содержать текстовое значение и код, а также выступать в роли разделителей ({ type: 'divider' }) или заголовков категорий ({ type: 'header', label: 'Текст' }).
   *
   * @param v Значение метода
   * @default []
   */
  options(opts: { label?: string; value?: string; type?: "item" | "header" | "divider" }[]): this {
    this._options = opts;
    return this;
  }

  /**
   * Текущее выбранное значение или массив выбранных значений при множественном выборе (multiple).
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string | string[]): this {
    this._selected = v;
    return this;
  }

  /**
   * Устаревший (deprecated) синоним для value.
   *
   * @param v Значение метода
   */
  selected(v: string | string[]): this {
    return this.value(v);
  }

  /**
   * Вызывается при выборе нового элемента или элементов из списка. Передает выбранное значение или массив значений при множественном выборе (multiple).
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  /**
   * Визуальный стиль выпадающего списка. 'default' — стандартное поле формы, 'glass' — стильная полупрозрачная кнопка с размытием (аналогичная кнопкам в верхней панели фильтров).
   *
   * @param v Значение метода
   * @default 'default'
   */
  variant(v: "default" | "glass"): this {
    this._variant = v;
    return this;
  }

  /**
   * Имя иконки из библиотеки Lucide для отображения внутри кнопки слева (применяется только если variant: 'glass', например: 'Flame', 'Settings', 'Filter').
   *
   * @param v Значение метода
   */
  icon(v: string): this {
    this._icon = v;
    return this;
  }

  /**
   * Определяет, закрывать ли меню при выборе элемента. По умолчанию true для обычного выбора и false при множественном выборе (multiple).
   *
   * @param v Значение метода
   * @default true
   */
  closeOnSelect(v: boolean): this {
    this._closeOnSelect = v;
    return this;
  }

  /**
   * Включает режим множественного выбора. Выбранные значения возвращаются в виде массива, а клики по опциям переключают их активность без автоматического закрытия меню.
   *
   * @param v Значение метода
   * @default false
   */
  multiple(v: boolean): this {
    this._multiple = v;
    return this;
  }

  /**
   * Текст кнопки сброса параметров внизу поповера (если задан, кнопка сброса будет отображаться).
   *
   * @param v Значение метода
   */
  resetLabel(v: string): this {
    this._resetLabel = v;
    return this;
  }

  /**
   * Значение, устанавливаемое при нажатии на кнопку сброса параметров (например, пустой массив [] для множественного выбора).
   *
   * @param v Значение метода
   * @default ''
   */
  resetValue(v: string | string[]): this {
    this._resetValue = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      label: this._label,
      options: this._options,
      selected: this._selected,
      variant: this._variant,
      icon: this._icon,
      closeOnSelect: this._closeOnSelect,
      multiple: this._multiple,
      resetLabel: this._resetLabel,
      resetValue: this._resetValue
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

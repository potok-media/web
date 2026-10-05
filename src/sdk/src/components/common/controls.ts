import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Range (Ползунок)
 * 
 * Ползунок выбора числового значения в диапазоне [min, max] с шагом step и необязательным отображением текущего значения.
 * 
 * @example
 * // Ползунок громкости
 * const { ui, createState } = PotokSDK;
 * const state = createState({ volume: 50 });
 * 
 * function draw() {
 *   ui.render(
 *     Range("volume")
 *       .label("Громкость")
 *       .min(0)
 *       .max(100)
 *       .step(1)
 *       .value(state.volume)
 *       .showValue(true)
 *       .onChange((v) => state.volume = v)
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class RangeBuilder extends UIComponent {
  private _name: string;
  private _value: number;
  private _min?: number;
  private _max?: number;
  private _step?: number;
  private _label?: string;
  private _showValue?: boolean;
  private _onChange?: CallbackFunction;

  constructor(name: string) {
    super("Range");
    this.id(name);
    this._name = name;
    this._value = 0;
  }

  /**
   * Текущее значение.
   *
   * @param v Значение метода
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * Минимальное значение диапазона.
   *
   * @param v Значение метода
   */
  min(v: number): this { this._min = v; return this; }
  /**
   * Максимальное значение диапазона.
   *
   * @param v Значение метода
   */
  max(v: number): this { this._max = v; return this; }
  /**
   * Шаг изменения значения.
   *
   * @param v Значение метода
   */
  step(v: number): this { this._step = v; return this; }
  /**
   * Подпись над ползунком.
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Показывать текущее значение справа от подписи.
   *
   * @param v Значение метода
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }
  /**
   * Коллбек изменения. Передаёт число.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      value: this._value,
      min: this._min,
      max: this._max,
      step: this._step,
      label: this._label,
      showValue: this._showValue
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

/**
 * CodeEditor (Редактор кода)
 * 
 * Встроенный полнофункциональный редактор кода на базе Monaco. Поддерживает подсветку синтаксиса, автодополнение, номера строк и форматирование кода.
 * 
 * @example
 * // Редактор кода Monaco
 * const { ui, createState } = PotokSDK;
 * const state = createState({ code: "console.log('Привет, мир!');" });
 * 
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .child(
 *         CodeEditor("js-editor")
 *           .label("Редактор скриптов")
 *           .value(state.code)
 *           .readOnly(false)
 *           .onChange((v) => state.code = v)
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class CodeEditorBuilder extends UIComponent {
  private _name: string;
  private _value: string;
  private _label?: string;
  private _readOnly?: boolean;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("CodeEditor");
    this.id(n);
    this._name = n;
    this._value = "";
  }

  /**
   * Заголовок-подпись над контейнером редактора.
   *
   * @param v Значение метода
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * Исходный или текущий текст в редакторе.
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * Флаг блокировки редактирования. При true редактор переходит в режим просмотра.
   *
   * @param v Значение метода
   * @default false
   */
  readOnly(v: boolean): this {
    this._readOnly = v;
    return this;
  }

  /**
   * Срабатывает при любом изменении исходного кода в окне редактора.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      name: this._name,
      label: this._label,
      value: this._value,
      readOnly: this._readOnly
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

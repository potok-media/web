import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * SearchBar (Панель поиска)
 * 
 * Специализированная поисковая строка со встроенной иконкой лупы и кнопкой быстрой очистки поля ввода. Отлично подходит для создания систем поиска контента.
 * 
 * @example
 * // Строка поиска
 * const { ui, createState } = PotokSDK;
 * const state = createState({ query: "" });
 * 
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .child(
 *         SearchBar()
 *           .value(state.query)
 *           .placeholder("Введите название...")
 *           .onChange((v) => state.query = v)
 *           .onClear(() => state.query = "")
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SearchBarBuilder extends UIComponent {
  private _value?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;
  private _onClear?: CallbackFunction;

  constructor() {
    super("SearchBar");
  }

  /**
   * Текущий текст в поисковой строке.
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * Подсказка ввода внутри поисковой строки.
   *
   * @param v Значение метода
   * @default 'Поиск...'
   */
  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  /**
   * Коллбек при изменении текста поискового запроса пользователем.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  /**
   * Коллбек при клике на иконку «Крестик» для сброса поисковой строки.
   *
   * @param v Значение метода
   */
  onClear(cb: CallbackFunction): this {
    this._onClear = cb;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      value: this._value,
      placeholder: this._placeholder
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    if (this._onClear) {
      json.events = { ...json.events, onClear: CallbackRegistry.register(this._onClear, `${path}/onClear`) };
    }
    return json;
  }
}

import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Input (Поле ввода)
 * 
 * Текстовое поле ввода для заполнения данных форм, адресов серверов, ключей авторизации или фильтров.
 * 
 * @example
 * // Ввод данных формы
 * const { ui, createState } = PotokSDK;
 * 
 * const state = createState({ username: "", password: "" });
 * 
 * function draw() {
 *   ui.render(
 *     Card()
 *       .title("Авторизация")
 *       .child(
 *         VStack()
 *           .spacing(12)
 *           .child(
 *             Input("login")
 *               .label("Имя пользователя")
 *               .placeholder("Введите email")
 *               .value(state.username)
 *               .onChange((v) => state.username = v)
 *           )
 *           .child(
 *             Input("password")
 *               .label("Пароль")
 *               .placeholder("••••••••")
 *               .inputType("password")
 *               .value(state.password)
 *               .onChange((v) => state.password = v)
 *           )
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class InputBuilder extends UIComponent {
  private _name: string;
  private _inputType: string;
  private _value: string;
  private _label?: string;
  private _placeholder?: string;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("Input");
    this.id(n);
    this._name = n;
    this._inputType = 'text';
    this._value = "";
  }

  /**
   * Заголовок (ярлык), отображаемый непосредственно над полем ввода.
   *
   * @param v Значение метода
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * Текст подсказки, отображаемый внутри пустого поля ввода.
   *
   * @param v Значение метода
   */
  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  /**
   * Задает тип вводимых данных. Изменяет поведение поля и маскирует ввод для 'password'.
   *
   * @param v Значение метода
   * @default 'text'
   */
  inputType(v: string): this {
    this._inputType = v;
    return this;
  }

  /**
   * Устаревший (deprecated) синоним для inputType.
   *
   * @param v Значение метода
   */
  type(v: string): this {
    return this.inputType(v);
  }

  /**
   * Текущее текстовое значение поля.
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  /**
   * Обработчик ввода текста, вызываемый при каждом изменении значения.
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
      placeholder: this._placeholder,
      inputType: this._inputType,
      value: this._value
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
 * Toggle (Переключатель)
 * 
 * Интерактивный переключатель (чекбокс/свитч) для активации/деактивации булевых параметров конфигурации.
 * 
 * @example
 * // Переключатель настроек
 * const { ui, createState } = PotokSDK;
 * const state = createState({ autoplay: false });
 * 
 * function draw() {
 *   ui.render(
 *     Toggle("autoplay-toggle")
 *       .label("Автовоспроизведение")
 *       .description("Воспроизводить следующую серию автоматически")
 *       .value(state.autoplay)
 *       .onChange((v) => {
 *         state.autoplay = v;
 *         ui.showHUD("info", "Автовоспроизведение: " + (v ? "ВКЛ" : "ВЫКЛ"));
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class ToggleBuilder extends UIComponent {
  private _name: string;
  private _checked: boolean;
  private _label?: string;
  private _description?: string;
  private _onChange?: CallbackFunction;

  constructor(n: string) {
    super("Toggle");
    this.id(n);
    this._name = n;
    this._checked = false;
  }

  /**
   * Текстовый ярлык, отображаемый справа от переключателя.
   *
   * @param v Значение метода
   */
  label(v: string): this {
    this._label = v;
    return this;
  }

  /**
   * Дополнительное описание (текст мелким шрифтом), отображаемое под меткой переключателя.
   *
   * @param v Значение метода
   */
  description(v: string): this {
    this._description = v;
    return this;
  }

  /**
   * Текущее булево состояние переключателя (true / false).
   *
   * @param v Значение метода
   * @default false
   */
  value(v: boolean): this {
    this._checked = v;
    return this;
  }

  /**
   * Устаревший (deprecated) синоним для value.
   *
   * @param v Значение метода
   */
  checked(v: boolean): this {
    return this.value(v);
  }

  /**
   * Обработчик клика, возвращающий новое булево состояние свитча.
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
      description: this._description,
      checked: this._checked
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

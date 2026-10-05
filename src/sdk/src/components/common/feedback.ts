import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * ProgressBar (Полоса прогресса)
 * 
 * Горизонтальный индикатор прогресса (0..1) с необязательной подписью и процентом.
 * 
 * @example
 * // Полосы прогресса
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(ProgressBar().value(0.35).label("Загрузка").showValue(true))
 *     .child(ProgressBar().value(0.8).variant("success"))
 * );
 */
export class ProgressBarBuilder extends UIComponent {
  private _value: number;
  private _variant?: string;
  private _label?: string;
  private _showValue?: boolean;

  constructor() {
    super("ProgressBar");
    this._value = 0;
  }

  /**
   * Значение прогресса от 0 до 1.
   *
   * @param v Значение метода
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * Цвет полосы прогресса.
   *
   * @param v Значение метода
   * @default 'accent'
   */
  variant(v: "accent" | "success" | "warning" | "error"): this { this._variant = v; return this; }
  /**
   * Подпись над полосой.
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Показывать процент справа.
   *
   * @param v Значение метода
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { value: this._value, variant: this._variant, label: this._label, showValue: this._showValue };
  }
}

/**
 * Skeleton (Плейсхолдер загрузки)
 * 
 * Обобщённый мерцающий плейсхолдер произвольного размера. Полезен для собственных состояний загрузки.
 * 
 * @example
 * // Плейсхолдеры загрузки
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Skeleton().height(24).width("60%"))
 *     .child(Skeleton().height(120).rounded("0.75rem"))
 *     .child(Skeleton().height(16).count(3))
 * );
 */
export class SkeletonBuilder extends UIComponent {
  private _rounded?: boolean | string;
  private _count?: number;

  constructor() {
    super("Skeleton");
  }

  /**
   * Скругление углов: true или CSS-значение.
   *
   * @param v Значение метода
   */
  rounded(v: boolean | string): this { this._rounded = v; return this; }
  /**
   * Количество повторяющихся строк-плейсхолдеров.
   *
   * @param v Значение метода
   * @default 1
   */
  count(v: number): this { this._count = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { rounded: this._rounded, count: this._count };
  }
}

/**
 * EmptyState (Пустое состояние)
 * 
 * Заглушка для пустых списков и экранов: иконка, заголовок, описание и необязательная кнопка действия.
 * 
 * @example
 * // Пустое состояние
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   EmptyState()
 *     .icon("inbox")
 *     .title("Пока ничего нет")
 *     .description("Добавьте первый элемент, чтобы начать.")
 *     .actionLabel("Добавить")
 *     .onAction(() => ui.showHUD("info", "Создание..."))
 * );
 */
export class EmptyStateBuilder extends UIComponent {
  private _icon?: string;
  private _title?: string;
  private _description?: string;
  private _actionLabel?: string;
  private _onAction?: CallbackFunction;

  constructor() {
    super("EmptyState");
  }

  /**
   * Имя иконки Lucide по центру заглушки.
   *
   * @param v Значение метода
   */
  icon(v: string): this { this._icon = v; return this; }
  /**
   * Заголовок заглушки.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Пояснительное описание.
   *
   * @param v Значение метода
   */
  description(v: string): this { this._description = v; return this; }
  /**
   * Текст кнопки действия (кнопка появляется только если задан).
   *
   * @param v Значение метода
   */
  actionLabel(v: string): this { this._actionLabel = v; return this; }
  /**
   * Коллбек клика по кнопке действия.
   *
   * @param v Значение метода
   */
  onAction(cb: CallbackFunction): this { this._onAction = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { icon: this._icon, title: this._title, description: this._description, actionLabel: this._actionLabel };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = { ...json.events, onAction: CallbackRegistry.register(this._onAction, `${path}/onAction`) };
    }
    return json;
  }
}

/**
 * FileInput (Выбор файла)
 * 
 * Поле выбора файла с фильтром типов. onChange получает { names, count } — имена и количество выбранных файлов.
 * 
 * @example
 * // Загрузка постера
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   FileInput("poster")
 *     .label("Загрузить постер")
 *     .accept("image/*")
 *     .multiple(false)
 *     .onChange((info) => ui.showHUD("info", "Выбрано файлов: " + info.count))
 * );
 */
export class FileInputBuilder extends UIComponent {
  private _name: string;
  private _label?: string;
  private _accept?: string;
  private _multiple?: boolean;
  private _onChange?: CallbackFunction;

  constructor(name: string) {
    super("FileInput");
    this.id(name);
    this._name = name;
  }

  /**
   * Подпись над полем.
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Фильтр типов файлов (например, 'image/*').
   *
   * @param v Значение метода
   */
  accept(v: string): this { this._accept = v; return this; }
  /**
   * Разрешить выбор нескольких файлов.
   *
   * @param v Значение метода
   * @default false
   */
  multiple(v: boolean): this { this._multiple = v; return this; }
  /**
   * Коллбек выбора. Получает { names: string[], count }.
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this { this._onChange = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { name: this._name, label: this._label, accept: this._accept, multiple: this._multiple };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = { ...json.events, onChange: CallbackRegistry.register(this._onChange, `${path}/onChange`) };
    }
    return json;
  }
}

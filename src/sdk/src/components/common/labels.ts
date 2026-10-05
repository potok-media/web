import { UIComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Badge (Бейдж)
 * 
 * Компактная закругленная метка с цветным фоном. Подходит для вывода качества видео, статусов подписки, меток «Новинка» и других тегов.
 * 
 * @example
 * // Бейджи
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(8)
 *     .child(Badge("FullHD").color("info"))
 *     .child(Badge("Новое").color("success"))
 *     .child(Badge("Популярное").color("warning"))
 *     .child(Badge("18+").color("error"))
 * );
 */
export class BadgeBuilder extends UIComponent {
  private _text: string;
  private _color: string;

  constructor(t: string) {
    super("Badge");
    this._text = t;
    this._color = 'info';
  }

  /**
   * Цветовая схема заливки бейджа.
   *
   * @param v Значение метода
   * @default 'info'
   */
  color(v: string): this {
    this._color = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      text: this._text,
      color: this._color
    };
  }
}

/**
 * StatusRow (Строка статуса)
 * 
 * Компонент для отображения состояния внешних систем или соединений с цветным индикатором (точкой) и текстовым значением.
 * 
 * @example
 * // Строки статуса
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Card()
 *     .title("Состояние системы")
 *     .child(
 *       VStack()
 *         .spacing(8)
 *         .child(StatusRow("Основной сервер (BFF)").status("success").value("Активен (18ms)"))
 *         .child(StatusRow("Локальный прокси-сервер").status("warning").value("Таймаут (450ms)"))
 *         .child(StatusRow("Резервное зеркало").status("offline").value("Недоступно"))
 *     )
 * );
 */
export class StatusRowBuilder extends UIComponent {
  private _label: string;
  private _status?: string;
  private _value?: string;

  constructor(label: string) {
    super("StatusRow");
    this._label = label;
  }

  /**
   * Состояние статуса (меняет цвет точки: зеленый/желтый/серый соответственно).
   *
   * @param v Значение метода
   */
  status(v: string): this {
    this._status = v;
    return this;
  }

  /**
   * Текстовое значение, выравниваемое по правому краю строки (например, '24 ms' или 'v1.2.0').
   *
   * @param v Значение метода
   */
  value(v: string): this {
    this._value = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return {
      label: this._label,
      status: this._status,
      value: this._value
    };
  }
}

/**
 * SectionHeader (Заголовок секции)
 * 
 * Заголовок раздела страницы с необязательным подзаголовком и кнопкой действия («Показать все»).
 * 
 * @example
 * // Заголовок раздела
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   SectionHeader("Продолжить просмотр")
 *     .subtitle("12 фильмов и сериалов")
 *     .actionLabel("Показать все")
 *     .onAction(() => ui.showHUD("info", "Все элементы раздела"))
 * );
 */
export class SectionHeaderBuilder extends UIComponent {
  private _title: string;
  private _subtitle?: string;
  private _actionLabel?: string;
  private _onAction?: CallbackFunction;

  constructor(title: string) {
    super("SectionHeader");
    this._title = title;
  }

  /**
   * Подзаголовок под основным заголовком.
   *
   * @param v Значение метода
   */
  subtitle(v: string): this { this._subtitle = v; return this; }
  /**
   * Текст кнопки действия справа (кнопка появляется только если задан onAction).
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
    return { title: this._title, subtitle: this._subtitle, actionLabel: this._actionLabel };
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
 * Alert (Инлайн-уведомление)
 * 
 * Цветной баннер уведомления (info/success/warning/error) с иконкой, заголовком и текстом.
 * 
 * @example
 * // Уведомления
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Alert("Соединение установлено").variant("success").icon("check-circle"))
 *     .child(Alert("Проверьте настройки сервера").variant("warning").title("Внимание").icon("alert-triangle"))
 * );
 */
export class AlertBuilder extends UIComponent {
  private _text: string;
  private _title?: string;
  private _variant?: string;
  private _icon?: string;

  constructor(text: string) {
    super("Alert");
    this._text = text;
  }

  /**
   * Заголовок уведомления.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Цветовая схема уведомления.
   *
   * @param v Значение метода
   * @default 'info'
   */
  variant(v: "info" | "success" | "warning" | "error"): this { this._variant = v; return this; }
  /**
   * Имя иконки Lucide (по умолчанию подбирается по variant).
   *
   * @param v Значение метода
   */
  icon(v: string): this { this._icon = v; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, title: this._title, variant: this._variant, icon: this._icon };
  }
}

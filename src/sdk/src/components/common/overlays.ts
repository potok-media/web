import { UIComponent, LayoutComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Modal (Модальное окно)
 * 
 * Портальное окно поверх приложения: диалог, шторка (sheet) или поповер. Закрывается по ESC и клику на фон. Управляется состоянием open; содержимое — любые дочерние компоненты.
 * 
 * @example
 * // Диалог подтверждения
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: false });
 * 
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .children([
 *         Button("Открыть окно").onClick(() => state.open = true),
 *         Modal()
 *           .open(state.open)
 *           .title("Подтверждение")
 *           .variant("modal")
 *           .closeOnBackdrop(true)
 *           .onClose(() => state.open = false)
 *           .child(Text("Вы уверены, что хотите продолжить?").variant("secondary"))
 *           .child(
 *             HStack()
 *               .spacing(8)
 *               .children([
 *                 Button("Отмена").variant("secondary").onClick(() => state.open = false),
 *                 Button("Продолжить").variant("primary").onClick(() => {
 *                   state.open = false;
 *                   ui.showHUD("success", "Готово");
 *                 })
 *               ])
 *           )
 *       ])
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class ModalBuilder extends LayoutComponent {
  private _open?: boolean;
  private _title?: string;
  private _variant?: "modal" | "sheet" | "popover";
  private _closeOnBackdrop?: boolean;
  private _onClose?: CallbackFunction;

  constructor() {
    super("Modal");
  }

  /**
   * Управляет видимостью окна.
   *
   * @param v Значение метода
   * @default false
   */
  open(v: boolean): this { this._open = v; return this; }
  /**
   * Заголовок в шапке окна.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Тип оверлея: центрированный диалог, нижняя шторка или поповер.
   *
   * @param v Значение метода
   * @default 'modal'
   */
  variant(v: "modal" | "sheet" | "popover"): this { this._variant = v; return this; }
  /**
   * Закрывать окно по клику на затемнённый фон.
   *
   * @param v Значение метода
   * @default true
   */
  closeOnBackdrop(v: boolean): this { this._closeOnBackdrop = v; return this; }
  /**
   * Коллбек закрытия (ESC, клик на фон).
   *
   * @param v Значение метода
   */
  onClose(cb: CallbackFunction): this { this._onClose = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { open: this._open, title: this._title, variant: this._variant, closeOnBackdrop: this._closeOnBackdrop };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClose) {
      json.events = { ...json.events, onClose: CallbackRegistry.register(this._onClose, `${path}/onClose`) };
    }
    return json;
  }
}

/**
 * Collapsible (Сворачиваемая секция)
 * 
 * Секция с кликабельным заголовком и скрываемым телом. Управляется состоянием open; несколько секций подряд образуют аккордеон.
 * 
 * @example
 * // Раскрывающаяся секция настроек
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: true });
 * 
 * function draw() {
 *   ui.render(
 *     Collapsible("Дополнительные параметры")
 *       .open(state.open)
 *       .onToggle((open) => state.open = open)
 *       .child(Text("Скрытое содержимое секции.").variant("secondary"))
 *       .child(Toggle("adv").label("Экспертный режим").value(false).onChange(() => {}))
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class CollapsibleBuilder extends LayoutComponent {
  private _title?: string;
  private _open?: boolean;
  private _onToggle?: CallbackFunction;

  constructor(title: string) {
    super("Collapsible");
    this._title = title;
  }

  /**
   * The section header (clicking it collapses/expands the body).
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Раскрыта ли секция.
   *
   * @param v Значение метода
   * @default false
   */
  open(v: boolean): this { this._open = v; return this; }
  /**
   * Коллбек переключения. Передаёт новое булево состояние.
   *
   * @param v Значение метода
   */
  onToggle(cb: CallbackFunction): this { this._onToggle = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, open: this._open };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onToggle) {
      json.events = { ...json.events, onToggle: CallbackRegistry.register(this._onToggle, `${path}/onToggle`) };
    }
    return json;
  }
}

/**
 * Tooltip (Всплывающая подсказка)
 * 
 * Оборачивает дочерний элемент и показывает текстовую подсказку при наведении или фокусе.
 * 
 * @example
 * // Подсказка на кнопке
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Tooltip("Удалить навсегда")
 *     .placement("top")
 *     .child(Button("Удалить").variant("danger"))
 * );
 */
export class TooltipBuilder extends UIComponent {
  private _text: string;
  private _placement?: "top" | "bottom" | "left" | "right";
  private _child?: UIComponent;

  constructor(text: string) {
    super("Tooltip");
    this._text = text;
  }

  /**
   * Позиция подсказки относительно элемента.
   *
   * @param v Значение метода
   * @default 'top'
   */
  placement(v: "top" | "bottom" | "left" | "right"): this { this._placement = v; return this; }
  /**
   * Обёрнутый элемент, к которому привязана подсказка.
   *
   * @param v Значение метода
   */
  child(elm: UIComponent): this { this._child = elm; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, placement: this._placement };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._child && typeof this._child.compile === "function") {
      const childId = this._child._hasCustomId ? this._child._id : "child";
      json.children = [this._child.compile(`${path}/${childId}`)];
    }
    return json;
  }
}

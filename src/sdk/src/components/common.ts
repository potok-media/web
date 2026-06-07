import { UIComponent, LayoutComponent } from "./base";
import { CallbackRegistry, type CallbackFunction } from "../core/registry";


/**
 * VStack (Вертикальный стек)
 * 
 * Контейнер, который выстраивает дочерние компоненты вертикально друг под другом.
 * 
 * @example
 * // Вертикальный стек
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(20)
 *     .alignItems("center")
 *     .child(Heading("Заголовок"))
 *     .child(Text("Параграф текста под заголовком."))
 *     .child(Button("Ок"))
 * );
 */
export class VStackBuilder extends LayoutComponent {
  constructor() {
    super("VStack");
  }
}

/**
 * HStack (Горизонтальный стек)
 * 
 * Контейнер, который выстраивает дочерние компоненты горизонтально слева направо.
 * 
 * @example
 * // Горизонтальный стек
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(15)
 *     .justifyContent("between")
 *     .alignItems("center")
 *     .child(Text("Элемент 1"))
 *     .child(Text("Элемент 2"))
 *     .child(Button("Кнопка"))
 * );
 */
export class HStackBuilder extends LayoutComponent {
  constructor() {
    super("HStack");
  }
}

/**
 * Grid (Сетка)
 * 
 * Контейнер, который отрисовывает адаптивную сетку ячеек с фиксированной минимальной шириной колонки.
 * 
 * @example
 * // Адаптивная сетка
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Grid()
 *     .minWidth("8rem")
 *     .gap("1rem")
 *     .child(Card().title("Карточка 1").child(Text("Текст")))
 *     .child(Card().title("Карточка 2").child(Text("Текст")))
 *     .child(Card().title("Карточка 3").child(Text("Текст")))
 * );
 */
export class GridBuilder extends LayoutComponent {
  private _minWidth: string;
  private _gap: string;

  constructor() {
    super("Grid");
    this._minWidth = "180px";
    this._gap = "var(--space-m)";
  }

  /**
   * Минимально допустимая ширина одной колонки сетки (например, '12rem').
   *
   * @param v Значение метода
   * @default '180px'
   */
  minWidth(v: string): this {
    this._minWidth = v;
    return this;
  }

  /**
   * Зазор/отступ между ячейками сетки (например, '1rem').
   *
   * @param v Значение метода
   * @default 'var(--space-m)'
   */
  gap(v: string): this {
    this._gap = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      ...super.getProps(),
      minWidth: this._minWidth,
      gap: this._gap
    };
  }
}

/**
 * Card (Стеклянная карточка)
 * 
 * Панель-карточка с границами, размытием и эффектом матового стекла (glassmorphism). Используется для визуальной группировки логических блоков.
 * 
 * @example
 * // Карточка
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Card()
 *     .title("Основные сведения")
 *     .subtitle("Дополнительная информация")
 *     .child(Text("Внутри карточки находится этот текст."))
 * );
 */
export class CardBuilder extends UIComponent {
  private _title?: string;
  private _subtitle?: string;
  private _child?: UIComponent;

  constructor() {
    super("Card");
  }

  /**
   * Заголовок карточки, выводимый в её верхней части.
   *
   * @param v Значение метода
   */
  title(v: string): this {
    this._title = v;
    return this;
  }

  /**
   * Подзаголовок карточки, выводимый мелким приглушенным шрифтом.
   *
   * @param v Значение метода
   */
  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

  /**
   * Вкладывает один дочерний компонент внутрь тела карточки.
   *
   * @param v Значение метода
   */
  child(elm: UIComponent): this {
    this._child = elm;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      title: this._title,
      subtitle: this._subtitle
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._child) {
      if (typeof this._child.compile !== "function") {
        json.children = [{
          type: "Text",
          id: "child_fallback",
          props: {
            text: String(this._child)
          }
        }];
      } else {
        const childId = this._child._hasCustomId ? this._child._id : "child";
        json.children = [this._child.compile(`${path}/${childId}`)];
      }
    }
    return json;
  }
}

/**
 * Heading (Заголовок)
 * 
 * Компонент для вывода крупных структурированных заголовков разного уровня (аналог тегов h1-h4).
 * 
 * @example
 * // Заголовки
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(Heading("Главный заголовок H1").level(1))
 *     .child(Heading("Подзаголовок уровня H2").level(2))
 *     .child(Heading("Раздел H3").level(3))
 *     .child(Heading("Мелкий заголовок H4").level(4))
 * );
 */
export class HeadingBuilder extends UIComponent {
  private _text: string;
  private _level: number;

  constructor(t: string) {
    super("Heading");
    this._text = t;
    this._level = 1;
  }

  /**
   * Определяет размер и важность заголовка (1 — самый большой, 4 — самый маленький).
   *
   * @param v Значение метода
   * @default 1
   */
  level(v: number): this {
    this._level = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      text: this._text,
      level: this._level
    };
  }
}

/**
 * Text (Обычный текст)
 * 
 * Основной текстовый элемент для вывода описаний, подписей, ошибок или любого другого неструктурированного контента.
 * 
 * @example
 * // Оформление текстов
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Text("Это стандартный основной текст (primary).").variant("primary"))
 *     .child(Text("Это второстепенный текст описания (secondary).").variant("secondary").size("sm"))
 *     .child(Text("Успешная операция завершена (success).").variant("success").bold(true))
 *     .child(Text("Внимание! Требуется действие (warning).").variant("warning"))
 *     .child(Text("Критическая ошибка приложения (error).").variant("error").size("lg").bold(true))
 * );
 */
export class TextBuilder extends UIComponent {
  private _text: string;
  private _variant: string;
  private _size: string;
  private _bold: boolean;

  constructor(t: string) {
    super("Text");
    this._text = t;
    this._variant = 'primary';
    this._size = 'md';
    this._bold = false;
  }

  /**
   * Цветовой вариант текста (тема). Обычный, приглушенный серый, зеленый, желтый или красный соответственно.
   *
   * @param v Значение метода
   * @default 'primary'
   */
  variant(v: string): this {
    this._variant = v;
    return this;
  }

  /**
   * Задает размер шрифта текста.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: string): this {
    this._size = v;
    return this;
  }

  /**
   * Делает начертание шрифта жирным при значении true.
   *
   * @param v Значение метода
   * @default false
   */
  bold(v: boolean): this {
    this._bold = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      text: this._text,
      variant: this._variant,
      size: this._size,
      bold: this._bold
    };
  }
}

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

  protected override getProps(): Record<string, any> {
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

  protected override getProps(): Record<string, any> {
    return {
      label: this._label,
      status: this._status,
      value: this._value
    };
  }
}

/**
 * Divider (Разделитель)
 * 
 * Горизонтальная тонкая линия-разделитель для визуального отделения блоков контента или строк в списках.
 * 
 * @example
 * // Разделитель
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(Text("Текст сверху"))
 *     .child(Divider())
 *     .child(Text("Текст снизу"))
 * );
 */
export class DividerBuilder extends UIComponent {
  constructor() {
    super("Divider");
  }

  protected override getProps(): Record<string, any> {
    return {};
  }
}

/**
 * Spacer (Распорка)
 * 
 * Пустой упругий элемент (распорка), заполняющий все доступное свободное пространство во флекс-контейнере. Полезен внутри HStack или VStack для прижатия элементов к краям.
 * 
 * @example
 * // Распорка
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .child(Text("Левая сторона"))
 *     .child(Spacer())
 *     .child(Text("Правая сторона"))
 * );
 */
export class SpacerBuilder extends UIComponent {
  constructor() {
    super("Spacer");
  }

  protected override getProps(): Record<string, any> {
    return {};
  }
}

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

  protected override getProps(): Record<string, any> {
    return {
      text: this._text,
      variant: this._variant,
      icon: this._icon
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClick) {
      json.events = json.events || {};
      json.events.onClick = CallbackRegistry.register(this._onClick, `${path}/onClick`);
    }
    return json;
  }
}

/**
 * Input (Поле ввода)
 * 
 * Текстовое поле ввода для заполнения данных форм, адресов серверов, ключей авторизации или фильтров.
 * 
 * @example
 * // Ввод данных формы
 * const { ui, createState } = PotokSDK;
 * 
 * const state = createState({ username: "" });
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

  protected override getProps(): Record<string, any> {
    return {
      name: this._name,
      label: this._label,
      placeholder: this._placeholder,
      inputType: this._inputType,
      value: this._value
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = json.events || {};
      json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
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

  protected override getProps(): Record<string, any> {
    return {
      name: this._name,
      label: this._label,
      description: this._description,
      checked: this._checked
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = json.events || {};
      json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
    }
    return json;
  }
}

/**
 * Select (Выпадающий список)
 * 
 * Компонент выпадающего списка (Dropdown) для выбора одного текстового значения из предопределенного массива вариантов.
 * 
 * @example
 * // Выпадающий список локализации
 * const { ui, createState } = PotokSDK;
 * const state = createState({ lang: "ru" });
 * 
 * function draw() {
 *   ui.render(
 *     Select("lang-select")
 *       .label("Язык интерфейса")
 *       .options([
 *         { label: "Русский язык", value: "ru" },
 *         { label: "English", value: "en" }
 *       ])
 *       .value(state.lang)
 *       .onChange((v) => {
 *         state.lang = v;
 *         ui.showHUD("success", "Установлен язык: " + v);
 *       })
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class SelectBuilder extends UIComponent {
  private _name: string;
  private _options: any[];
  private _selected: string;
  private _label?: string;
  private _onChange?: CallbackFunction;

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
   * Массив доступных элементов списка. Каждый элемент должен иметь отображаемое имя (label) и программное значение (value).
   *
   * @param v Значение метода
   * @default []
   */
  options(opts: any[]): this {
    this._options = opts;
    return this;
  }

  /**
   * Текущее выбранное значение (соответствующее полю value выбранной опции).
   *
   * @param v Значение метода
   * @default ''
   */
  value(v: string): this {
    this._selected = v;
    return this;
  }

  /**
   * Устаревший (deprecated) синоним для value.
   *
   * @param v Значение метода
   */
  selected(v: string): this {
    return this.value(v);
  }

  /**
   * Вызывается при выборе нового элемента из списка. Передает выбранное значение (value).
   *
   * @param v Значение метода
   */
  onChange(cb: CallbackFunction): this {
    this._onChange = cb;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      name: this._name,
      label: this._label,
      options: this._options,
      selected: this._selected
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = json.events || {};
      json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
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

  protected override getProps(): Record<string, any> {
    return {
      name: this._name,
      label: this._label,
      value: this._value,
      readOnly: this._readOnly
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onChange) {
      json.events = json.events || {};
      json.events.onChange = CallbackRegistry.register(this._onChange, `${path}/onChange`);
    }
    return json;
  }
}

/**
 * Markdown (Рендеринг разметки)
 * 
 * Компонент для форматированного вывода текста с поддержкой списков, жирного шрифта, таблиц и гиперссылок. Безопасно парсит Markdown разметку, исключая XSS-уязвимости.
 * 
 * @example
 * // Рендеринг Markdown
 * const { ui } = PotokSDK;
 * 
 * const markdownContent = `# Описание плагина
 * Этот плагин позволяет осуществлять быстрый поиск фильмов по открытым базам.
 * 
 * ## Возможности
 * * Просмотр постеров в высоком качестве
 * * Быстрая фильтрация по раздачам
 * * Интеграция с VLC-плеером
 * `;
 * 
 * ui.render(
 *   Card()
 *     .title("Справка")
 *     .child(
 *       Markdown(markdownContent)
 *     )
 * );
 */
export class MarkdownBuilder extends UIComponent {
  private _content: string;

  constructor(content: string) {
    super("Markdown");
    this._content = content;
  }

  /**
   * Задает или динамически обновляет текстовое содержимое Markdown разметки. Позволяет перезаписать текст после вызова конструктора.
   *
   * @param v Значение метода
   */
  content(v: string): this {
    this._content = v;
    return this;
  }

  protected override getProps(): Record<string, any> {
    return {
      content: this._content
    };
  }
}

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
 *     .child(Text("Приглушённая подсказка (hint).").variant("hint"))
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
  private _options: any[];
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
  options(opts: any[]): this {
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

  protected override getProps(): Record<string, any> {
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
 *       // content() позволяет заменить разметку динамически уже после создания компонента
 *       Markdown("# Загрузка…").content(markdownContent)
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

/**
 * Image (Изображение)
 * 
 * Адаптивное изображение с ленивой загрузкой и запасной картинкой (fallback) при ошибке. Позволяет плагину выводить произвольные картинки, а не только через MediaCard.
 * 
 * @example
 * // Изображение с соотношением сторон и скруглением
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Image("https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
 *     .alt("Постер")
 *     .aspectRatio("2/3")
 *     .rounded(true)
 *     .fit("cover")
 *     .fallback("https://image.tmdb.org/t/p/w500/gEU2QthHGvGo1q7T2XzAwETYNsC.jpg")
 *     .width("12rem")
 *     .onClick(() => ui.showHUD("info", "Клик по изображению"))
 * );
 */
export class ImageBuilder extends UIComponent {
  private _src: string;
  private _alt?: string;
  private _aspectRatio?: string;
  private _fallback?: string;
  private _rounded?: boolean | string;
  private _fit?: "cover" | "contain";
  private _onClick?: CallbackFunction;

  constructor(src: string) {
    super("Image");
    this._src = src;
  }

  /**
   * Альтернативный текст изображения.
   *
   * @param v Значение метода
   */
  alt(v: string): this { this._alt = v; return this; }
  /**
   * Соотношение сторон рамки (например, '16/9' или '2/3').
   *
   * @param v Значение метода
   */
  aspectRatio(v: string): this { this._aspectRatio = v; return this; }
  /**
   * URL запасного изображения, показываемого при ошибке загрузки.
   *
   * @param v Значение метода
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * Скругление углов: true для стандартного радиуса или CSS-значение.
   *
   * @param v Значение метода
   */
  rounded(v: boolean | string): this { this._rounded = v; return this; }
  /**
   * Режим вписывания изображения в рамку.
   *
   * @param v Значение метода
   * @default 'cover'
   */
  fit(v: "cover" | "contain"): this { this._fit = v; return this; }
  /**
   * Коллбек клика по изображению.
   *
   * @param v Значение метода
   */
  onClick(cb: CallbackFunction): this { this._onClick = cb; return this; }

  protected override getProps(): Record<string, any> {
    return {
      src: this._src,
      alt: this._alt,
      aspectRatio: this._aspectRatio,
      fallback: this._fallback,
      rounded: this._rounded,
      fit: this._fit
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
 * Icon (Иконка)
 * 
 * Отдельная иконка из коллекции Lucide (например, 'play', 'heart', 'settings').
 * 
 * @example
 * // Набор иконок
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .child(Icon("heart").color("#ff4d4f"))
 *     .child(Icon("star").size("1.5rem").color("#faad14"))
 *     .child(Icon("settings"))
 * );
 */
export class IconBuilder extends UIComponent {
  private _name: string;
  private _size?: string | number;
  private _color?: string;

  constructor(name: string) {
    super("Icon");
    this._name = name;
  }

  /**
   * Размер иконки (например, '1.5rem' или 24).
   *
   * @param v Значение метода
   */
  size(v: string | number): this { this._size = v; return this; }
  /**
   * Цвет иконки (CSS-цвет).
   *
   * @param v Значение метода
   */
  color(v: string): this { this._color = v; return this; }

  protected override getProps(): Record<string, any> {
    return { name: this._name, size: this._size, color: this._color };
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
  private _items: any[];
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
  items(v: any[]): this { this._items = v; return this; }
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

  protected override getProps(): Record<string, any> {
    return { items: this._items, value: this._value };
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
 * List (Список строк)
 * 
 * Вертикальный список кликабельных строк с иконкой, заголовком, подзаголовком, бейджем и завершающей иконкой.
 * 
 * @example
 * // Список пунктов меню
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   List()
 *     .items([
 *       { id: "a", title: "Настройки", subtitle: "Общие параметры", icon: "settings", trailingIcon: "chevron-right" },
 *       { id: "b", title: "Аккаунт", badge: "PRO", icon: "user", trailingIcon: "chevron-right" }
 *     ])
 *     .onItemClick((item) => ui.showHUD("info", "Выбрано: " + item.title))
 * );
 */
export class ListBuilder extends UIComponent {
  private _items: any[];
  private _onItemClick?: CallbackFunction;

  constructor() {
    super("List");
    this._items = [];
  }

  /**
   * Массив строк: { id, title, subtitle?, icon?, badge?, trailingIcon?, disabled? }.
   *
   * @param v Значение метода
   * @default []
   */
  items(v: any[]): this { this._items = v; return this; }
  /**
   * Коллбек клика по строке. Передаёт объект строки.
   *
   * @param v Значение метода
   */
  onItemClick(cb: CallbackFunction): this { this._onItemClick = cb; return this; }

  protected override getProps(): Record<string, any> {
    return { items: this._items };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onItemClick) {
      json.events = json.events || {};
      json.events.onItemClick = CallbackRegistry.register(this._onItemClick, `${path}/onItemClick`);
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

  protected override getProps(): Record<string, any> {
    return { text: this._text, placement: this._placement };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._child && typeof this._child.compile === "function") {
      const childId = this._child._hasCustomId ? this._child._id : "child";
      json.children = [this._child.compile(`${path}/${childId}`)];
    }
    return json;
  }
}

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

  protected override getProps(): Record<string, any> {
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

  protected override getProps(): Record<string, any> {
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

  protected override getProps(): Record<string, any> {
    return { icon: this._icon, title: this._title, description: this._description, actionLabel: this._actionLabel };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = json.events || {};
      json.events.onAction = CallbackRegistry.register(this._onAction, `${path}/onAction`);
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

  protected override getProps(): Record<string, any> {
    return { text: this._text, title: this._title, variant: this._variant, icon: this._icon };
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

  protected override getProps(): Record<string, any> {
    return { text: this._text, active: this._active, icon: this._icon };
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

  protected override getProps(): Record<string, any> {
    return { icon: this._icon, label: this._label, accent: this._accent, size: this._size };
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

// ---------------------------------------------------------------------------
// Phase 2 builders. Authored bare — scripts/document-sdk.js injects canonical
// JSDoc from componentsMetadata (single source of truth for docs + examples).
// ---------------------------------------------------------------------------

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

  protected override getProps(): Record<string, any> {
    return { open: this._open, title: this._title, variant: this._variant, closeOnBackdrop: this._closeOnBackdrop };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onClose) {
      json.events = json.events || {};
      json.events.onClose = CallbackRegistry.register(this._onClose, `${path}/onClose`);
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
   * Заголовок секции (клик по нему сворачивает/разворачивает тело).
   *
   * @param v Значение метода
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

  protected override getProps(): Record<string, any> {
    return { title: this._title, open: this._open };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onToggle) {
      json.events = json.events || {};
      json.events.onToggle = CallbackRegistry.register(this._onToggle, `${path}/onToggle`);
    }
    return json;
  }
}

/**
 * Avatar (Аватар)
 * 
 * Круглое или квадратное изображение пользователя/актёра с ленивой загрузкой. При отсутствии картинки показывает инициалы из имени.
 * 
 * @example
 * // Аватары
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   HStack()
 *     .spacing(12)
 *     .alignItems("center")
 *     .children([
 *       Avatar("https://image.tmdb.org/t/p/w185/wD6U1N7Caw58tO43fT245U62y4a.jpg")
 *         .name("Мэттью Макконахи")
 *         .size("lg")
 *         .shape("circle"),
 *       Avatar("")
 *         .name("Энн Хэтэуэй")
 *         .size("md")
 *         .shape("square")
 *         .fallback("https://image.tmdb.org/t/p/w185/tLelKoPNiyJCSEtQTz1FGv4TLGc.jpg")
 *     ])
 * );
 */
export class AvatarBuilder extends UIComponent {
  private _src: string;
  private _name?: string;
  private _size?: "sm" | "md" | "lg";
  private _fallback?: string;
  private _shape?: "circle" | "square";

  constructor(src: string) {
    super("Avatar");
    this._src = src;
  }

  /**
   * Имя: инициалы для запасного варианта и alt-текст.
   *
   * @param v Значение метода
   */
  name(v: string): this { this._name = v; return this; }
  /**
   * Размер аватара.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }
  /**
   * URL запасного изображения при ошибке загрузки.
   *
   * @param v Значение метода
   */
  fallback(v: string): this { this._fallback = v; return this; }
  /**
   * Форма аватара.
   *
   * @param v Значение метода
   * @default 'circle'
   */
  shape(v: "circle" | "square"): this { this._shape = v; return this; }

  protected override getProps(): Record<string, any> {
    return { src: this._src, name: this._name, size: this._size, fallback: this._fallback, shape: this._shape };
  }
}

/**
 * Rating (Рейтинг звёздами)
 * 
 * Строка звёзд, отображающая оценку от 0 до max с поддержкой половинных звёзд и необязательным числовым значением.
 * 
 * @example
 * // Рейтинги
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .children([
 *       Rating().value(4.5).max(5).showValue(true).size("md"),
 *       Rating().value(3).max(5).size("sm")
 *     ])
 * );
 */
export class RatingBuilder extends UIComponent {
  private _value: number;
  private _max?: number;
  private _showValue?: boolean;
  private _size?: "sm" | "md" | "lg";

  constructor() {
    super("Rating");
    this._value = 0;
  }

  /**
   * Значение рейтинга (поддерживает дробное для половинных звёзд).
   *
   * @param v Значение метода
   * @default 0
   */
  value(v: number): this { this._value = v; return this; }
  /**
   * Максимальное число звёзд.
   *
   * @param v Значение метода
   * @default 5
   */
  max(v: number): this { this._max = v; return this; }
  /**
   * Показывать числовое значение справа.
   *
   * @param v Значение метода
   * @default false
   */
  showValue(v: boolean): this { this._showValue = v; return this; }
  /**
   * Размер звёзд.
   *
   * @param v Значение метода
   * @default 'md'
   */
  size(v: "sm" | "md" | "lg"): this { this._size = v; return this; }

  protected override getProps(): Record<string, any> {
    return { value: this._value, max: this._max, showValue: this._showValue, size: this._size };
  }
}

/**
 * TagList (Список тегов)
 * 
 * Набор тегов/жанров в виде пилюль. Статичные по умолчанию; при заданном onTagClick становятся кликабельными.
 * 
 * @example
 * // Жанры-теги
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   TagList()
 *     .tags(["Фэнтези", "Драма", { id: "action", label: "Боевик" }])
 *     .onTagClick((id) => ui.showHUD("info", "Тег: " + id))
 * );
 */
export class TagListBuilder extends UIComponent {
  private _tags: any[];
  private _onTagClick?: CallbackFunction;

  constructor() {
    super("TagList");
    this._tags = [];
  }

  /**
   * Массив тегов: строки или объекты { id?, label }.
   *
   * @param v Значение метода
   * @default []
   */
  tags(v: any[]): this { this._tags = v; return this; }
  /**
   * Коллбек клика по тегу. Передаёт id (или строку).
   *
   * @param v Значение метода
   */
  onTagClick(cb: CallbackFunction): this { this._onTagClick = cb; return this; }

  protected override getProps(): Record<string, any> {
    return { tags: this._tags };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onTagClick) {
      json.events = json.events || {};
      json.events.onTagClick = CallbackRegistry.register(this._onTagClick, `${path}/onTagClick`);
    }
    return json;
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

  protected override getProps(): Record<string, any> {
    return { title: this._title, subtitle: this._subtitle, actionLabel: this._actionLabel };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onAction) {
      json.events = json.events || {};
      json.events.onAction = CallbackRegistry.register(this._onAction, `${path}/onAction`);
    }
    return json;
  }
}

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

  protected override getProps(): Record<string, any> {
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
  private _items: any[];
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
  items(v: any[]): this { this._items = v; return this; }
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

  protected override getProps(): Record<string, any> {
    return { items: this._items, value: this._value };
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

// ---------------------------------------------------------------------------
// Phase 2 batch 3 — Dropdown, FileInput, Field, Carousel, Scroller, Page.
// Authored bare; scripts/document-sdk.js injects canonical JSDoc.
// ---------------------------------------------------------------------------

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
  private _items: any[];
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
  items(v: any[]): this { this._items = v; return this; }
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

  protected override getProps(): Record<string, any> {
    return { label: this._label, icon: this._icon, items: this._items, value: this._value };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    if (this._onSelect) {
      json.events = json.events || {};
      json.events.onSelect = CallbackRegistry.register(this._onSelect, `${path}/onSelect`);
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

  protected override getProps(): Record<string, any> {
    return { name: this._name, label: this._label, accept: this._accept, multiple: this._multiple };
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
 * Field (Поле формы)
 * 
 * Обёртка контрола с подписью сверху и подсказкой снизу. Оборачивает любой вложенный контрол (Input, Select, Range и т.д.).
 * 
 * @example
 * // Поле с подписью и подсказкой
 * const { ui, createState } = PotokSDK;
 * const state = createState({ url: "" });
 * 
 * function draw() {
 *   ui.render(
 *     Field()
 *       .label("Адрес сервера")
 *       .hint("Например, http://localhost:8080")
 *       .child(
 *         Input("url")
 *           .placeholder("http://...")
 *           .value(state.url)
 *           .onChange((v) => state.url = v)
 *       )
 *   );
 * }
 * state.$subscribe(draw); draw();
 */
export class FieldBuilder extends LayoutComponent {
  private _label?: string;
  private _hint?: string;

  constructor() {
    super("Field");
  }

  /**
   * Подпись над контролом.
   *
   * @param v Значение метода
   */
  label(v: string): this { this._label = v; return this; }
  /**
   * Подсказка под контролом.
   *
   * @param v Значение метода
   */
  hint(v: string): this { this._hint = v; return this; }

  protected override getProps(): Record<string, any> {
    return { label: this._label, hint: this._hint };
  }
}

/**
 * Carousel (Карусель)
 * 
 * Горизонтальная карусель произвольных элементов со скролл-снапом. В отличие от рядов контента, принимает любые компоненты.
 * 
 * @example
 * // Карусель карточек
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Carousel()
 *     .spacing(16)
 *     .children([
 *       Card().title("Слайд 1").child(Text("Первый слайд")),
 *       Card().title("Слайд 2").child(Text("Второй слайд")),
 *       Card().title("Слайд 3").child(Text("Третий слайд"))
 *     ])
 * );
 */
export class CarouselBuilder extends LayoutComponent {
  constructor() {
    super("Carousel");
  }
}

/**
 * Scroller (Скролл-контейнер)
 * 
 * Обобщённый контейнер с прокруткой (горизонтальной или вертикальной) для произвольных элементов.
 * 
 * @example
 * // Горизонтальная лента тегов
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Scroller()
 *     .orientation("horizontal")
 *     .spacing(12)
 *     .children([
 *       Badge("Тег 1"),
 *       Badge("Тег 2"),
 *       Badge("Тег 3"),
 *       Badge("Тег 4"),
 *       Badge("Тег 5")
 *     ])
 * );
 */
export class ScrollerBuilder extends LayoutComponent {
  private _orientation?: "horizontal" | "vertical";

  constructor() {
    super("Scroller");
  }

  /**
   * Направление прокрутки.
   *
   * @param v Значение метода
   * @default 'vertical'
   */
  orientation(v: "horizontal" | "vertical"): this { this._orientation = v; return this; }

  protected override getProps(): Record<string, any> {
    return { ...super.getProps(), orientation: this._orientation };
  }
}

/**
 * Page (Оболочка страницы)
 * 
 * Оболочка кастомной страницы плагина с заголовком и областью контента (на базе PageFrame).
 * 
 * @example
 * // Оболочка страницы
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   Page()
 *     .title("Моя страница")
 *     .spacing(16)
 *     .children([
 *       SectionHeader("Раздел"),
 *       Text("Контент страницы во всю ширину, обёрнутый в оболочку PageFrame.").variant("secondary")
 *     ])
 * );
 */
export class PageBuilder extends LayoutComponent {
  private _title?: string;

  constructor() {
    super("Page");
  }

  /**
   * Заголовок страницы в шапке.
   *
   * @param v Значение метода
   */
  title(v: string): this { this._title = v; return this; }

  protected override getProps(): Record<string, any> {
    return { ...super.getProps(), title: this._title };
  }
}

// Sidebar category group — lets a plugin add its OWN titled section (like "МЕДИАТЕКА") to the sidebar,
// not just buttons into existing sections. Use with sidebar-item Buttons inside the 'sidebar-groups' slot.
/**
 * SidebarGroup (Категория бокового меню)
 * 
 * Собственная секция боковой панели с заголовком-категорией и кнопками — как встроенная «МЕДИАТЕКА». Контрибьютится в слот 'sidebar-groups' (registerSlotContribution), внутрь кладутся кнопки Button().variant('sidebar-item'). Позволяет плагину добавить ЦЕЛУЮ категорию, а не только кнопки в существующую.
 * 
 * @example
 * // Своя категория в боковом меню (в реальном плагине — layout для слота 'sidebar-groups')
 * const { ui } = PotokSDK;
 * 
 * ui.render(
 *   SidebarGroup("Аниме")
 *     .child(
 *       Button("Каталог")
 *         .variant("sidebar-item")
 *         .icon("clapperboard")
 *         .onClick(() => ui.navigateTo("/extensions/potok-shikimori"))
 *     )
 *     .child(
 *       Button("Случайное")
 *         .variant("sidebar-item")
 *         .icon("shuffle")
 *         .onClick(() => ui.showHUD("info", "Случайное аниме"))
 *     )
 * );
 */
export class SidebarGroupBuilder extends LayoutComponent {
  private _title?: string;

  constructor(title: string) {
    super("SidebarGroup");
    this._title = title;
  }

  title(v: string): this { this._title = v; return this; }

  protected override getProps(): Record<string, any> {
    return { title: this._title };
  }
}

import { UIComponent, LayoutComponent } from "../base";

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

  protected override getProps(): Record<string, unknown> {
    return {
      ...super.getProps(),
      minWidth: this._minWidth,
      gap: this._gap
    };
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

  protected override getProps(): Record<string, unknown> {
    return {};
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

  protected override getProps(): Record<string, unknown> {
    return {};
  }
}

// Sidebar category group — lets a plugin add its OWN titled section (like "MEDIA LIBRARY") to the sidebar,
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

  title(v: string): this {
    this._title = v;
    return this;
  }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title };
  }
}

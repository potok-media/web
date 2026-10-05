import { UIComponent, LayoutComponent, type CompiledComponent } from "../base";

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

  protected override getProps(): Record<string, unknown> {
    return {
      title: this._title,
      subtitle: this._subtitle
    };
  }

  override compile(path: string = "root"): CompiledComponent {
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

  protected override getProps(): Record<string, unknown> {
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

  protected override getProps(): Record<string, unknown> {
    return { ...super.getProps(), title: this._title };
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

  protected override getProps(): Record<string, unknown> {
    return { label: this._label, hint: this._hint };
  }
}

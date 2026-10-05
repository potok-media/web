import { UIComponent } from "../base";

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

  protected override getProps(): Record<string, unknown> {
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

  protected override getProps(): Record<string, unknown> {
    return {
      text: this._text,
      variant: this._variant,
      size: this._size,
      bold: this._bold
    };
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

  protected override getProps(): Record<string, unknown> {
    return {
      content: this._content
    };
  }
}

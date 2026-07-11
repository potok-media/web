import { UIComponent } from "../base";

/**
 * Heading (Heading)
 *
 * A component for rendering large structured headings of varying levels (analogous to h1-h4 tags).
 *
 * @example
 * // Headings
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(12)
 *     .child(Heading("Main heading H1").level(1))
 *     .child(Heading("H2 subheading").level(2))
 *     .child(Heading("H3 section").level(3))
 *     .child(Heading("Small heading H4").level(4))
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
   * Defines the size and importance of the heading (1 — largest, 4 — smallest).
   *
   * @param v Method value
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
 * Text (Plain text)
 *
 * The primary text element for rendering descriptions, captions, errors, or any other unstructured content.
 *
 * @example
 * // Text styling
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   VStack()
 *     .spacing(10)
 *     .child(Text("This is the standard primary text (primary).").variant("primary"))
 *     .child(Text("This is secondary description text (secondary).").variant("secondary").size("sm"))
 *     .child(Text("The operation completed successfully (success).").variant("success").bold(true))
 *     .child(Text("A muted hint (hint).").variant("hint"))
 *     .child(Text("A critical application error (error).").variant("error").size("lg").bold(true))
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
   * The color variant (theme) of the text. Normal, muted gray, green, yellow, or red respectively.
   *
   * @param v Method value
   * @default 'primary'
   */
  variant(v: string): this {
    this._variant = v;
    return this;
  }

  /**
   * Sets the font size of the text.
   *
   * @param v Method value
   * @default 'md'
   */
  size(v: string): this {
    this._size = v;
    return this;
  }

  /**
   * Makes the font weight bold when set to true.
   *
   * @param v Method value
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
 * Markdown (Markup rendering)
 *
 * A component for rendering formatted text with support for lists, bold, tables, and hyperlinks. Safely parses Markdown markup, preventing XSS vulnerabilities.
 *
 * @example
 * // Markdown rendering
 * const { ui } = PotokSDK;
 *
 * const markdownContent = `# Plugin description
 * This plugin enables fast movie search across open databases.
 *
 * ## Features
 * * View posters in high quality
 * * Fast filtering by torrents
 * * Integration with the VLC player
 * `;
 *
 * ui.render(
 *   Card()
 *     .title("Help")
 *     .child(
 *       // content() lets you replace the markup dynamically after the component is created
 *       Markdown("# Loading…").content(markdownContent)
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
   * Sets or dynamically updates the Markdown text content. Lets you overwrite the text after the constructor call.
   *
   * @param v Method value
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

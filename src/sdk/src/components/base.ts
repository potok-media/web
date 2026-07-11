/** Serialized layout node produced by compile() and postMessage'd to the host. */
export interface CompiledComponent {
  type: string;
  id: string;
  props: Record<string, unknown>;
  events?: Record<string, string>;
  children?: CompiledComponent[];
}

/** Compiles a builder to its layout node, or passes a raw layout object through unchanged. */
export function compileMaybe(ui: unknown): unknown {
  return ui && typeof (ui as { compile?: unknown }).compile === "function"
    ? (ui as UIComponent).compile()
    : ui;
}

export class UIComponent {
  public _type: string;
  public _id: string;
  public _hasCustomId = false;
  protected _visible: boolean;
  protected _disabled: boolean;
  protected _padding?: unknown;
  protected _margin?: unknown;
  protected _width?: string | number;
  protected _height?: string | number;
  protected _flex?: number;
  // Curated style tokens — applied inline by the host (sanitized), so a plugin can tweak the look of ANY
  // component without arbitrary CSS/className injection. Dangerous values are dropped host-side.
  protected _background?: string;
  protected _textColor?: string;
  protected _borderColor?: string;
  protected _borderRadius?: string;
  protected _shadow?: string;
  protected _opacity?: number;

  constructor(type: string) {
    this._type = type;
    this._id = type.toLowerCase() + "_" + Math.random().toString(36).substring(2, 9);
    this._visible = true;
    this._disabled = false;
  }

  id(v: string): this {
    this._id = v;
    this._hasCustomId = true;
    return this;
  }
  padding(v: unknown): this { this._padding = v; return this; }
  margin(v: unknown): this { this._margin = v; return this; }
  width(v: string | number): this { this._width = v; return this; }
  height(v: string | number): this { this._height = v; return this; }
  visible(v: boolean): this { this._visible = v; return this; }
  disabled(v: boolean): this { this._disabled = v; return this; }
  flex(v: number): this { this._flex = v; return this; }
  /** Фон компонента: CSS-цвет или градиент (например, '#1e1e2e', 'rgba(0,0,0,.4)', 'linear-gradient(...)'). */
  background(v: string): this { this._background = v; return this; }
  /** Цвет текста (CSS-цвет). */
  textColor(v: string): this { this._textColor = v; return this; }
  /** Цвет рамки (добавляет сплошную рамку 1px, если её не было). */
  borderColor(v: string): this { this._borderColor = v; return this; }
  /** Скругление углов (CSS-длина, например '0.75rem' или '50%'). */
  borderRadius(v: string): this { this._borderRadius = v; return this; }
  /** Тень (значение CSS box-shadow, например '0 8px 24px rgba(0,0,0,.3)'). */
  shadow(v: string): this { this._shadow = v; return this; }
  /** Прозрачность 0..1. */
  opacity(v: number): this { this._opacity = v; return this; }

  protected getProps(): Record<string, unknown> {
    return {};
  }

  compile(_path: string = "root"): CompiledComponent {
    return {
      type: this._type,
      id: this._id,
      props: {
        padding: this._padding,
        margin: this._margin,
        width: this._width,
        height: this._height,
        visible: this._visible,
        disabled: this._disabled,
        flex: this._flex,
        background: this._background,
        textColor: this._textColor,
        borderColor: this._borderColor,
        borderRadius: this._borderRadius,
        shadow: this._shadow,
        opacity: this._opacity,
        ...this.getProps()
      }
    };
  }
}

export class LayoutComponent extends UIComponent {
  protected _children: UIComponent[];
  protected _spacing?: number;
  protected _alignItems?: string;
  protected _justifyContent?: string;

  constructor(type: string) {
    super(type);
    this._children = [];
  }

  spacing(v: number): this { this._spacing = v; return this; }
  alignItems(v: string): this { this._alignItems = v; return this; }
  justifyContent(v: string): this { this._justifyContent = v; return this; }
  children(elms: UIComponent[]): this { this._children = elms; return this; }
  child(elm: UIComponent): this { this._children.push(elm); return this; }

  protected override getProps(): Record<string, unknown> {
    return {
      spacing: this._spacing,
      alignItems: this._alignItems,
      justifyContent: this._justifyContent
    };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    json.children = this._children
      .filter((c) => c !== null && c !== undefined)
      .map((c: UIComponent, index: number) => {
        if (!c || typeof c.compile !== "function") {
          return {
            type: "Text",
            id: `text_fallback_${index}`,
            props: {
              text: String(c)
            }
          };
        }
        const childId = c._hasCustomId ? c._id : `${c._type.toLowerCase()}_${index}`;
        return c.compile(`${path}/${childId}`);
      });
    return json;
  }
}

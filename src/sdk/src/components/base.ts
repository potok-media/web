export class UIComponent {
  public _type: string;
  public _id: string;
  public _hasCustomId = false;
  protected _visible: boolean;
  protected _disabled: boolean;
  protected _padding?: any;
  protected _margin?: any;
  protected _width?: string | number;
  protected _height?: string | number;
  protected _flex?: number;

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
  padding(v: any): this { this._padding = v; return this; }
  margin(v: any): this { this._margin = v; return this; }
  width(v: string | number): this { this._width = v; return this; }
  height(v: string | number): this { this._height = v; return this; }
  visible(v: boolean): this { this._visible = v; return this; }
  disabled(v: boolean): this { this._disabled = v; return this; }
  flex(v: number): this { this._flex = v; return this; }

  protected getProps(): Record<string, any> {
    return {};
  }

  compile(_path: string = "root"): any {
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

  protected override getProps(): Record<string, any> {
    return {
      spacing: this._spacing,
      alignItems: this._alignItems,
      justifyContent: this._justifyContent
    };
  }

  override compile(path: string = "root"): any {
    const json = super.compile(path);
    json.children = this._children
      .filter((c) => c !== null && c !== undefined)
      .map((c: any, index) => {
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

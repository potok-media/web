import { UIComponent, LayoutComponent } from "./base";
import { CallbackRegistry, type CallbackFunction } from "../core/registry";


export class VStackBuilder extends LayoutComponent {
  constructor() {
    super("VStack");
  }
}

export class HStackBuilder extends LayoutComponent {
  constructor() {
    super("HStack");
  }
}

export class GridBuilder extends LayoutComponent {
  private _minWidth: string;
  private _gap: string;

  constructor() {
    super("Grid");
    this._minWidth = "180px";
    this._gap = "var(--space-m)";
  }

  minWidth(v: string): this {
    this._minWidth = v;
    return this;
  }

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

export class CardBuilder extends UIComponent {
  private _title?: string;
  private _subtitle?: string;
  private _child?: UIComponent;

  constructor() {
    super("Card");
  }

  title(v: string): this {
    this._title = v;
    return this;
  }

  subtitle(v: string): this {
    this._subtitle = v;
    return this;
  }

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

export class HeadingBuilder extends UIComponent {
  private _text: string;
  private _level: number;

  constructor(t: string) {
    super("Heading");
    this._text = t;
    this._level = 1;
  }

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

  variant(v: string): this {
    this._variant = v;
    return this;
  }

  size(v: string): this {
    this._size = v;
    return this;
  }

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

export class BadgeBuilder extends UIComponent {
  private _text: string;
  private _color: string;

  constructor(t: string) {
    super("Badge");
    this._text = t;
    this._color = 'info';
  }

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

export class StatusRowBuilder extends UIComponent {
  private _label: string;
  private _status?: string;
  private _value?: string;

  constructor(label: string) {
    super("StatusRow");
    this._label = label;
  }

  status(v: string): this {
    this._status = v;
    return this;
  }

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

export class DividerBuilder extends UIComponent {
  constructor() {
    super("Divider");
  }

  protected override getProps(): Record<string, any> {
    return {};
  }
}

export class SpacerBuilder extends UIComponent {
  constructor() {
    super("Spacer");
  }

  protected override getProps(): Record<string, any> {
    return {};
  }
}

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

  variant(v: string): this {
    this._variant = v;
    return this;
  }

  icon(v: string): this {
    this._icon = v;
    return this;
  }

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

  label(v: string): this {
    this._label = v;
    return this;
  }

  placeholder(v: string): this {
    this._placeholder = v;
    return this;
  }

  inputType(v: string): this {
    this._inputType = v;
    return this;
  }

  /**
   * @deprecated Use inputType instead
   */
  type(v: string): this {
    return this.inputType(v);
  }

  value(v: string): this {
    this._value = v;
    return this;
  }

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

  label(v: string): this {
    this._label = v;
    return this;
  }

  description(v: string): this {
    this._description = v;
    return this;
  }

  value(v: boolean): this {
    this._checked = v;
    return this;
  }

  /**
   * @deprecated Use value instead
   */
  checked(v: boolean): this {
    return this.value(v);
  }

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

  label(v: string): this {
    this._label = v;
    return this;
  }

  options(opts: any[]): this {
    this._options = opts;
    return this;
  }

  value(v: string): this {
    this._selected = v;
    return this;
  }

  /**
   * @deprecated Use value instead
   */
  selected(v: string): this {
    return this.value(v);
  }

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

  label(v: string): this {
    this._label = v;
    return this;
  }

  value(v: string): this {
    this._value = v;
    return this;
  }

  readOnly(v: boolean): this {
    this._readOnly = v;
    return this;
  }

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

export class MarkdownBuilder extends UIComponent {
  private _content: string;

  constructor(content: string) {
    super("Markdown");
    this._content = content;
  }

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

/**
 * Basic UI component builders for the sandboxed Potok SDK.
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export const SDK_COMPONENTS_CODE = `
  class UIComponent {
    constructor(type) {
      this._type = type;
      this._id = type.toLowerCase() + "_" + Math.random().toString(36).substring(2, 9);
      this._visible = true;
      this._disabled = false;
    }
    id(v) { this._id = v; return this; }
    padding(v) { this._padding = v; return this; }
    margin(v) { this._margin = v; return this; }
    width(v) { this._width = v; return this; }
    height(v) { this._height = v; return this; }
    visible(v) { this._visible = v; return this; }
    disabled(v) { this._disabled = v; return this; }
    flex(v) { this._flex = v; return this; }

    compile() {
      return {
        type: this._type, id: this._id,
        props: {
          padding: this._padding, margin: this._margin, width: this._width, height: this._height,
          visible: this._visible, disabled: this._disabled, flex: this._flex, ...this.getProps()
        }
      };
    }
  }

  class LayoutComponent extends UIComponent {
    constructor(type) {
      super(type);
      this._children = [];
    }
    spacing(v) { this._spacing = v; return this; }
    alignItems(v) { this._alignItems = v; return this; }
    justifyContent(v) { this._justifyContent = v; return this; }
    children(elms) { this._children = elms; return this; }
    child(elm) { this._children.push(elm); return this; }
    getProps() { return { spacing: this._spacing, alignItems: this._alignItems, justifyContent: this._justifyContent }; }
    compile() {
      const json = super.compile();
      json.children = this._children.map(c => c.compile());
      return json;
    }
  }

  class VStackBuilder extends LayoutComponent { constructor() { super("VStack"); } }
  class HStackBuilder extends LayoutComponent { constructor() { super("HStack"); } }

  class CardBuilder extends UIComponent {
    constructor() { super("Card"); }
    title(v) { this._title = v; return this; }
    subtitle(v) { this._subtitle = v; return this; }
    child(elm) { this._child = elm; return this; }
    getProps() { return { title: this._title, subtitle: this._subtitle }; }
    compile() {
      const json = super.compile();
      if (this._child) json.children = [this._child.compile()];
      return json;
    }
  }

  class HeadingBuilder extends UIComponent {
    constructor(t) { super("Heading"); this._text = t; this._level = 1; }
    level(v) { this._level = v; return this; }
    getProps() { return { text: this._text, level: this._level }; }
  }

  class TextBuilder extends UIComponent {
    constructor(t) { super("Text"); this._text = t; this._variant = 'primary'; this._size = 'md'; this._bold = false; }
    variant(v) { this._variant = v; return this; }
    size(v) { this._size = v; return this; }
    bold(v) { this._bold = v; return this; }
    getProps() { return { text: this._text, variant: this._variant, size: this._size, bold: this._bold }; }
  }

  class BadgeBuilder extends UIComponent {
    constructor(t) { super("Badge"); this._text = t; this._color = 'info'; }
    color(v) { this._color = v; return this; }
    getProps() { return { text: this._text, color: this._color }; }
  }

  class DividerBuilder extends UIComponent { constructor() { super("Divider"); } getProps() { return {}; } }
  class SpacerBuilder extends UIComponent { constructor() { super("Spacer"); } getProps() { return {}; } }

  class ButtonBuilder extends UIComponent {
    constructor(t) { super("Button"); this._text = t; this._variant = 'secondary'; }
    variant(v) { this._variant = v; return this; }
    icon(v) { this._icon = v; return this; }
    onClick(cb) { this._onClick = cb; return this; }
    getProps() { return { text: this._text, variant: this._variant, icon: this._icon }; }
    compile() {
      const json = super.compile();
      if (this._onClick) {
        json.events = json.events || {};
        json.events.onClick = CallbackRegistry.register(this._onClick);
      }
      return json;
    }
  }

  class InputBuilder extends UIComponent {
    constructor(n) { super("Input"); this._name = n; this._inputType = 'text'; this._value = ""; }
    label(v) { this._label = v; return this; }
    placeholder(v) { this._placeholder = v; return this; }
    type(v) { this._inputType = v; return this; }
    value(v) { this._value = v; return this; }
    onChange(cb) { this._onChange = cb; return this; }
    getProps() { return { name: this._name, label: this._label, placeholder: this._placeholder, inputType: this._inputType, value: this._value }; }
    compile() {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class ToggleBuilder extends UIComponent {
    constructor(n) { super("Toggle"); this._name = n; this._checked = false; }
    label(v) { this._label = v; return this; }
    description(v) { this._description = v; return this; }
    checked(v) { this._checked = v; return this; }
    onChange(cb) { this._onChange = cb; return this; }
    getProps() { return { name: this._name, label: this._label, description: this._description, checked: this._checked }; }
    compile() {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class SelectBuilder extends UIComponent {
    constructor(n) { super("Select"); this._name = n; this._options = []; this._selected = ""; }
    label(v) { this._label = v; return this; }
    options(opts) { this._options = opts; return this; }
    selected(v) { this._selected = v; return this; }
    onChange(cb) { this._onChange = cb; return this; }
    getProps() { return { name: this._name, label: this._label, options: this._options, selected: this._selected }; }
    compile() {
      const json = super.compile();
      if (this._onChange) {
        json.events = json.events || {};
        json.events.onChange = CallbackRegistry.register(this._onChange);
      }
      return json;
    }
  }

  class MarkdownBuilder extends UIComponent {
    constructor(content) { super("Markdown"); this._content = content; }
    content(v) { this._content = v; return this; }
    getProps() { return { content: this._content }; }
  }
`;

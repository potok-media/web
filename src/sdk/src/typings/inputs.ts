export const inputsDts = `
  /** Button (Button) that triggers user actions. */
  interface ButtonBuilder extends UIComponent {
    /** Button style variant. */
    variant(v: 'primary' | 'secondary' | 'ghost' | 'sidebar-item' | string): this;
    /** Button icon (e.g. 'play', 'settings', 'terminal'). */
    icon(v: string): this;
    /** Puts the button into a disabled state. */
    disabled(v: boolean): this;
    /** Callback fired when the button is clicked. */
    onClick(cb: () => void): this;
  }

  /** Text input field (Input). */
  interface InputBuilder extends UIComponent {
    /** Text label shown above the field. */
    label(v: string): this;
    /** Placeholder shown inside the empty input. */
    placeholder(v: string): this;
    /** Type of the entered data. */
    inputType(v: 'text' | 'password' | 'number' | 'textarea'): this;
    /** Default value. */
    value(v: string | number): this;
    /** Disables editing of the field. */
    disabled(v: boolean): this;
    /** Callback fired on every change of the field text. */
    onChange(cb: (val: string) => void): this;
  }

  /** Two-state switch (Toggle / Switch). */
  interface ToggleBuilder extends UIComponent {
    /** Toggle label. */
    label(v: string): this;
    /** Short description shown under the toggle. */
    description(v: string): this;
    /** Current state (true/false). */
    value(v: boolean): this;
    /** Disables the toggle. */
    disabled(v: boolean): this;
    /** Callback fired when the state changes. */
    onChange(cb: (val: boolean) => void): this;
  }

  /** Dropdown list (Select) for choosing one or several values. */
  interface SelectBuilder extends UIComponent {
    /** Dropdown label. */
    label(v: string): this;
    /** List of available options. Options may carry a text label and a value, and may also act as dividers (type: 'divider') or category headers (type: 'header'). */
    options(v: { value?: string; label?: string; type?: "item" | "header" | "divider" }[]): this;
    /** The selected value, or an array of selected values in multiple mode. */
    value(v: string | string[]): this;
    /** Disables selection. */
    disabled(v: boolean): this;
    /** Callback fired when the selected item (or items) changes. */
    onChange(cb: (val: string | string[]) => void): this;
    /** Visual style of the selector ('default' or 'glass'). */
    variant(v: "default" | "glass"): this;
    /** Lucide icon rendered inside the button (only for variant: 'glass'). */
    icon(v: string): this;
    /** Whether to close the menu when an item is selected. */
    closeOnSelect(v: boolean): this;
    /** Enables multiple selection mode. */
    multiple(v: boolean): this;
    /** Label of the reset button at the bottom of the popover (the reset button is shown when set). */
    resetLabel(v: string): this;
    /** Value applied when the reset button is pressed. */
    resetValue(v: string | string[]): this;
  }

  /** Search bar (SearchBar). */
  interface SearchBarBuilder extends UIComponent {
    /** Placeholder shown inside the search field. */
    placeholder(v: string): this;
    /** Current search value. */
    value(v: string): this;
    /** Disables the search bar. */
    disabled(v: boolean): this;
    /** Callback fired as the search query is typed. */
    onChange(cb: (val: string) => void): this;
    /** Callback fired when the search is cleared. */
    onClear(cb: () => void): this;
  }

  /** Full-featured code editor (CodeEditor) with Monaco syntax highlighting. */
  interface CodeEditorBuilder extends UIComponent {
    /** Editor field label. */
    label(v: string): this;
    /** Code shown in the editor. */
    value(v: string): this;
    /** Callback fired when the code is edited. */
    onChange(cb: (val: string) => void): this;
  }
`;

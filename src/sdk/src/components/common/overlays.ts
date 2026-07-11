import { UIComponent, LayoutComponent, type CompiledComponent } from "../base";
import { CallbackRegistry, type CallbackFunction } from "../../core/registry";

/**
 * Modal (Modal window)
 *
 * A portal window on top of the app: a dialog, sheet, or popover. Closes on ESC and a backdrop click. Controlled by the open state; the content can be any child components.
 *
 * @example
 * // Confirmation dialog
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: false });
 *
 * function draw() {
 *   ui.render(
 *     VStack()
 *       .spacing(12)
 *       .children([
 *         Button("Open window").onClick(() => state.open = true),
 *         Modal()
 *           .open(state.open)
 *           .title("Confirmation")
 *           .variant("modal")
 *           .closeOnBackdrop(true)
 *           .onClose(() => state.open = false)
 *           .child(Text("Are you sure you want to continue?").variant("secondary"))
 *           .child(
 *             HStack()
 *               .spacing(8)
 *               .children([
 *                 Button("Cancel").variant("secondary").onClick(() => state.open = false),
 *                 Button("Continue").variant("primary").onClick(() => {
 *                   state.open = false;
 *                   ui.showHUD("success", "Done");
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
   * Controls the visibility of the window.
   *
   * @param v Method value
   * @default false
   */
  open(v: boolean): this { this._open = v; return this; }
  /**
   * The title in the window header.
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * The overlay type: a centered dialog, a bottom sheet, or a popover.
   *
   * @param v Method value
   * @default 'modal'
   */
  variant(v: "modal" | "sheet" | "popover"): this { this._variant = v; return this; }
  /**
   * Close the window on a click on the dimmed backdrop.
   *
   * @param v Method value
   * @default true
   */
  closeOnBackdrop(v: boolean): this { this._closeOnBackdrop = v; return this; }
  /**
   * Close callback (ESC, backdrop click).
   *
   * @param v Method value
   */
  onClose(cb: CallbackFunction): this { this._onClose = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { open: this._open, title: this._title, variant: this._variant, closeOnBackdrop: this._closeOnBackdrop };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onClose) {
      json.events = { ...json.events, onClose: CallbackRegistry.register(this._onClose, `${path}/onClose`) };
    }
    return json;
  }
}

/**
 * Collapsible (Collapsible section)
 *
 * A section with a clickable header and a collapsible body. Controlled by the open state; several sections in a row form an accordion.
 *
 * @example
 * // Expandable settings section
 * const { ui, createState } = PotokSDK;
 * const state = createState({ open: true });
 *
 * function draw() {
 *   ui.render(
 *     Collapsible("Additional options")
 *       .open(state.open)
 *       .onToggle((open) => state.open = open)
 *       .child(Text("Hidden section content.").variant("secondary"))
 *       .child(Toggle("adv").label("Expert mode").value(false).onChange(() => {}))
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
   * The section header (clicking it collapses/expands the body).
   *
   * @param v Method value
   */
  title(v: string): this { this._title = v; return this; }
  /**
   * Whether the section is expanded.
   *
   * @param v Method value
   * @default false
   */
  open(v: boolean): this { this._open = v; return this; }
  /**
   * Toggle callback. Passes the new boolean state.
   *
   * @param v Method value
   */
  onToggle(cb: CallbackFunction): this { this._onToggle = cb; return this; }

  protected override getProps(): Record<string, unknown> {
    return { title: this._title, open: this._open };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._onToggle) {
      json.events = { ...json.events, onToggle: CallbackRegistry.register(this._onToggle, `${path}/onToggle`) };
    }
    return json;
  }
}

/**
 * Tooltip (Tooltip)
 *
 * Wraps a child element and shows a text tooltip on hover or focus.
 *
 * @example
 * // Tooltip on a button
 * const { ui } = PotokSDK;
 *
 * ui.render(
 *   Tooltip("Delete permanently")
 *     .placement("top")
 *     .child(Button("Delete").variant("danger"))
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
   * The position of the tooltip relative to the element.
   *
   * @param v Method value
   * @default 'top'
   */
  placement(v: "top" | "bottom" | "left" | "right"): this { this._placement = v; return this; }
  /**
   * The wrapped element the tooltip is attached to.
   *
   * @param v Method value
   */
  child(elm: UIComponent): this { this._child = elm; return this; }

  protected override getProps(): Record<string, unknown> {
    return { text: this._text, placement: this._placement };
  }

  override compile(path: string = "root"): CompiledComponent {
    const json = super.compile(path);
    if (this._child && typeof this._child.compile === "function") {
      const childId = this._child._hasCustomId ? this._child._id : "child";
      json.children = [this._child.compile(`${path}/${childId}`)];
    }
    return json;
  }
}

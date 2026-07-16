export const baseDts = `
  /**
   * Base interface shared by every Potok SDK UI component.
   */
  interface UIComponent {
    /** Sets a unique component id (ID) used to track its state. */
    id(v: string): this;
    /** Sets the component width (e.g. '100%', '200px' or a number). */
    width(v: string | number): this;
    /** Sets the component height (e.g. '300px'). */
    height(v: string | number): this;
    /** Controls whether the component is visible on screen. */
    visible(v: boolean): this;
    /** Inner padding. A number (px) or an array [vert, horiz] / [top, right, bottom, left]. */
    padding(v: number | number[]): this;
    /** Outer margin. A number (px) or an array [vert, horiz] / [top, right, bottom, left]. */
    margin(v: number | number[]): this;
    /** Flex-grow factor inside a stack. */
    flex(v: number): this;
    /**
     * Attaches a custom CSS class (or space-separated classes) to the component's root element, so it can be
     * targeted from a stylesheet injected via PotokSDK.ui.injectHostCss(). Calls accumulate.
     * Example: Card().style('my-hero-card').
     */
    style(className: string): this;
    /** Component background: a CSS color or gradient (e.g. '#1e1e2e', 'rgba(0,0,0,.4)', 'linear-gradient(...)'). */
    background(v: string): this;
    /** Text color (CSS color). */
    textColor(v: string): this;
    /** Border color (adds a solid 1px border if none was set). */
    borderColor(v: string): this;
    /** Corner radius (CSS length, e.g. '0.75rem' or '50%'). */
    borderRadius(v: string): this;
    /** Shadow (a CSS box-shadow value, e.g. '0 8px 24px rgba(0,0,0,.3)'). */
    shadow(v: string): this;
    /** Opacity 0..1. */
    opacity(v: number): this;
  }
`;

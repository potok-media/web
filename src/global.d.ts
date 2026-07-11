export {};

declare global {
  interface Window {
    /** Runtime Docker env injection (production). Values are strings or `__VITE_*__` placeholders. */
    POTOK_CONFIG?: Record<string, string>;
    /** PrismJS attaches globally so its language components can register against it. */
    Prism?: unknown;
  }
}

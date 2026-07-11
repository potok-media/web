export const LocalStorageBridge = {
  cache: {} as Record<string, string>,

  init(initialData?: Record<string, string>): void {
    if (initialData) {
      this.cache = { ...initialData };
    }
  },

  getItem(key: string): string | null {
    const val = this.cache[key];
    return val !== undefined ? val : null;
  },

  setItem(key: string, value: unknown): Promise<void> {
    const strVal = String(value);
    this.cache[key] = strVal;

    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";

    setTimeout(() => {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'STORAGE_SET',
        payload: {
          requestId: "store_set_async_" + Math.random().toString(36).substring(2, 9),
          key,
          value: strVal
        }
      }, hostOrigin);
    }, 0);

    return Promise.resolve();
  },

  removeItem(key: string): Promise<void> {
    delete this.cache[key];

    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    setTimeout(() => {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'STORAGE_REMOVE',
        payload: { requestId: "store_rm_" + Math.random().toString(36).substring(2, 9), key }
      }, hostOrigin);
    }, 0);

    return Promise.resolve();
  },

  // Wipes ALL of this plugin's scoped storage (local mirror + persisted host copy).
  clear(): Promise<void> {
    this.cache = {};

    const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
    setTimeout(() => {
      window.parent.postMessage({
        source: 'potok-plugin-sdk',
        action: 'STORAGE_CLEAR',
        payload: { requestId: "store_clear_" + Math.random().toString(36).substring(2, 9) }
      }, hostOrigin);
    }, 0);

    return Promise.resolve();
  }
};

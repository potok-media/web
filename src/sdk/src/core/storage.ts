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

  setItem(key: string, value: any): Promise<void> {
    const strVal = String(value);
    this.cache[key] = strVal;

    const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";

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
  }
};

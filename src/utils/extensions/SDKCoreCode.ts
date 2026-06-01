/**
 * Core runtime utilities for the sandboxed Potok SDK.
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export const SDK_CORE_CODE = `
  class CallbackRegistry {
    static callbacks = new Map();
    static activeSlotId = null;
    static activeRenderCallbacks = new Set();
    static TTL = 300000; // 5 minutes auto-expiration
    static MAX_CALLBACKS = 500;

    static register(cb) {
      this.cleanup();
      const id = "cb_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const slotId = this.activeSlotId || "global";
      this.callbacks.set(id, { cb, slotId, createdAt: Date.now() });
      this.activeRenderCallbacks.add(id);

      // Enforce max callback limit to prevent leaks under heavy load
      if (this.callbacks.size > this.MAX_CALLBACKS) {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [k, v] of this.callbacks.entries()) {
          if (v.createdAt < oldestTime) {
            oldestTime = v.createdAt;
            oldestKey = k;
          }
        }
        if (oldestKey) {
          this.callbacks.delete(oldestKey);
        }
      }
      return id;
    }

    static get(id) {
      const entry = this.callbacks.get(id);
      if (!entry) return undefined;
      if (Date.now() - entry.createdAt > this.TTL) {
        this.callbacks.delete(id);
        return undefined;
      }
      return entry.cb;
    }

    static trigger(id, data) {
      const entry = this.callbacks.get(id);
      if (entry) {
        if (Date.now() - entry.createdAt > this.TTL) {
          this.callbacks.delete(id);
          return;
        }
        const { cb } = entry;
        if (data && typeof data === 'object') {
          if ('seasonNum' in data && 'epNum' in data) {
            cb(data.seasonNum, data.epNum);
          } else if ('episode' in data && 'audioId' in data) {
            cb(data.episode, data.audioId);
          } else {
            cb(data);
          }
        } else {
          cb(data);
        }
      }
    }

    static startRenderScope(slotId) {
      this.activeSlotId = slotId;
      this.activeRenderCallbacks.clear();
    }

    static commitRenderScope(slotId) {
      for (const [k, v] of this.callbacks.entries()) {
        if (v.slotId === slotId && !this.activeRenderCallbacks.has(k)) {
          this.callbacks.delete(k);
        }
      }
      this.activeSlotId = null;
    }

    static cleanup() {
      const now = Date.now();
      for (const [k, v] of this.callbacks.entries()) {
        if (now - v.createdAt > this.TTL) {
          this.callbacks.delete(k);
        }
      }
    }
  }

  function createState(init) {
    const listeners = new Set();
    const proxy = new Proxy(init, {
      set(target, key, value) {
        if (target[key] !== value) {
          target[key] = value;
          listeners.forEach(fn => fn());
        }
        return true;
      }
    });
    Object.defineProperty(proxy, '$subscribe', { value: (fn) => listeners.add(fn), enumerable: false });
    return proxy;
  }

  const HttpClient = {
    async get(url, headers) {
      return new Promise((resolve, reject) => {
        const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
        const handler = (event) => {
          const message = event.data;
          if (message && message.source === 'potok-host' && message.action === 'HTTP_RESPONSE' && message.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            if (message.payload.error) reject(new Error(message.payload.error));
            else resolve({ status: message.payload.status, data: message.payload.data });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'GET', headers } }, hostOrigin);
      });
    },
    async post(url, body, headers) {
      return new Promise((resolve, reject) => {
        const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
        const handler = (event) => {
          const message = event.data;
          if (message && message.source === 'potok-host' && message.action === 'HTTP_RESPONSE' && message.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            if (message.payload.error) reject(new Error(message.payload.error));
            else resolve({ status: message.payload.status, data: message.payload.data });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'POST', body, headers } }, hostOrigin);
      });
    }
  };

  const LocalStorageBridge = {
    cache: {},
    init(initialData) {
      if (initialData) {
        this.cache = { ...initialData };
      }
    },
    getItem(key) {
      const val = this.cache[key];
      return val !== undefined ? val : null;
    },
    setItem(key, value) {
      const strVal = String(value);
      this.cache[key] = strVal;
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
`;

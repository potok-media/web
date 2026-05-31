/**
 * Core runtime utilities for the sandboxed Potok SDK.
 * Strict compliance with WEB_ARCHITECTURAL_STANDARDS.md.
 */

export const SDK_CORE_CODE = `
  class CallbackRegistry {
    static callbacks = new Map();
    static activeSlotId = null;
    static activeRenderCallbacks = new Set();

    static register(cb) {
      const id = "cb_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const slotId = this.activeSlotId || "global";
      this.callbacks.set(id, { cb, slotId });
      this.activeRenderCallbacks.add(id);
      return id;
    }

    static get(id) {
      return this.callbacks.get(id)?.cb;
    }

    static trigger(id, data) {
      const entry = this.callbacks.get(id);
      if (entry) {
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
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'GET', headers } }, '*');
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
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'HTTP_REQUEST', payload: { requestId, url, method: 'POST', body, headers } }, '*');
      });
    }
  };

  const LocalStorageBridge = {
    async getItem(key) {
      return new Promise((resolve) => {
        const requestId = "store_get_" + Math.random().toString(36).substring(2, 9);
        const handler = (event) => {
          if (event.data && event.data.source === 'potok-host' && event.data.action === 'STORAGE_GET_RESPONSE' && event.data.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve(event.data.payload.value);
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'STORAGE_GET', payload: { requestId, key } }, '*');
      });
    },
    async setItem(key, value) {
      return new Promise((resolve) => {
        const requestId = "store_set_" + Math.random().toString(36).substring(2, 9);
        const handler = (event) => {
          if (event.data && event.data.source === 'potok-host' && event.data.action === 'STORAGE_SET_RESPONSE' && event.data.payload.requestId === requestId) {
            window.removeEventListener('message', handler);
            resolve();
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ source: 'potok-plugin-sdk', action: 'STORAGE_SET', payload: { requestId, key, value } }, '*');
      });
    }
  };
`;

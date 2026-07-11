export type ObservableState<T> = T & {
  $subscribe: (fn: () => void) => () => void;
};

function isPlainObjectOrArray(val: unknown): val is object {
  if (val === null || typeof val !== 'object') return false;
  if (Array.isArray(val)) return true;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

export function createState<T extends object>(init: T): ObservableState<T> {
  const listeners = new Set<() => void>();
  let pendingNotification = false;

  const trigger = () => {
    if (!pendingNotification) {
      pendingNotification = true;
      Promise.resolve().then(() => {
        pendingNotification = false;
        listeners.forEach(fn => {
          try {
            fn();
          } catch (e) {
            console.error("[createState] Error in subscriber:", e);
          }
        });
      });
    }
  };

  const cache = new WeakMap<object, unknown>();

  function createDeepProxy(val: unknown, onNotify: () => void): unknown {
    if (!isPlainObjectOrArray(val)) {
      return val;
    }
    if (cache.has(val)) {
      return cache.get(val);
    }

    const handler: ProxyHandler<Record<PropertyKey, unknown>> = {
      get(target, key, receiver) {
        const result = Reflect.get(target, key, receiver);
        if (result !== null && typeof result === 'object') {
          return createDeepProxy(result, onNotify);
        }
        return result;
      },
      set(target, key, value, receiver) {
        const oldValue = target[key];
        if (oldValue !== value) {
          const success = Reflect.set(target, key, value, receiver);
          if (success) {
            onNotify();
          }
          return success;
        }
        return true;
      },
      deleteProperty(target, key) {
        const hasKey = Reflect.has(target, key);
        const success = Reflect.deleteProperty(target, key);
        if (hasKey && success) {
          onNotify();
        }
        return success;
      }
    };

    const proxy = new Proxy(val as Record<PropertyKey, unknown>, handler);
    cache.set(val, proxy);
    return proxy;
  }

  const rootProxy = createDeepProxy(init, trigger);
  Object.defineProperty(rootProxy, '$subscribe', {
    value: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    enumerable: false,
    writable: false,
    configurable: false
  });
  return rootProxy as ObservableState<T>;
}

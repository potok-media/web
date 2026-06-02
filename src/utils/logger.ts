const isDev = import.meta.env.DEV;

export interface LogEntry {
  id: string;
  type: "info" | "warn" | "error";
  timestamp: number;
  message: string;
}

const MAX_LOGS = 1000;
const logHistory: LogEntry[] = [];
const listeners = new Set<(entry: LogEntry) => void>();

export const addLogEntry = (type: "info" | "warn" | "error", message: string) => {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random()}`,
    type,
    timestamp: Date.now(),
    message
  };
  logHistory.push(entry);
  if (logHistory.length > MAX_LOGS) {
    logHistory.shift();
  }
  listeners.forEach((l) => {
    try {
      l(entry);
    } catch {
      // Ignore listener errors
    }
  });
};

// Capture global browser errors and unhandled promise rejections
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    const errorMsg = e.error && e.error.message ? e.error.message : e.message;
    const file = e.filename ? e.filename.split("/").pop() : "unknown";
    addLogEntry("error", `Unhandled error: ${errorMsg} (${file}:${e.lineno}:${e.colno})`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
    addLogEntry("error", `Promise rejected: ${reason}`);
  });
}

export const logger = {
  log: (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    addLogEntry("info", msg);
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    addLogEntry("warn", msg);
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    const msg = args.map(a => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    addLogEntry("error", msg);
    console.error(...args);
  },
  getHistory: () => [...logHistory],
  clearHistory: () => {
    logHistory.length = 0;
    const clearEntry: LogEntry = {
      id: `log-clear-${Date.now()}`,
      type: "info",
      timestamp: Date.now(),
      message: "Console cleared"
    };
    listeners.forEach((l) => {
      try {
        l(clearEntry);
      } catch {}
    });
  },
  subscribe: (listener: (entry: LogEntry) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

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
    } catch (listenerError) {
      if (isDev) {
        console.warn("Log listener failed:", listenerError);
      }
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

const formatLogArg = (value: unknown): string => {
  if (value instanceof Error) return `${value.message}\n${value.stack ?? ""}`;
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const logger = {
  log: (...args: unknown[]) => {
    const msg = args.map(formatLogArg).join(" ");
    addLogEntry("info", msg);
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    const msg = args.map(formatLogArg).join(" ");
    addLogEntry("warn", msg);
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    const msg = args.map(formatLogArg).join(" ");
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
      } catch (listenerError) {
        if (isDev) {
          console.warn("Log listener failed on clear:", listenerError);
        }
      }
    });
  },
  subscribe: (listener: (entry: LogEntry) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
};

import { logger } from "../utils/logger";
import { Storage } from "../utils/StorageService";

/**
 * Network logging for debugging. ON BY DEFAULT (no UI — the remote can't always reach
 * Settings on the device we're debugging). Logs method/URL + request & response headers
 * for every API call into the console / in-app Console viewer.
 *
 * To silence without a rebuild: set `localStorage.netDebug = "false"`. This is debug-only
 * instrumentation — remove it once the issue is understood.
 *
 * Secrets are redacted — auth tokens must never land in the console history (which is
 * viewable in-app and exportable).
 *
 * Most API fetches run inside the data worker, where the main-thread console UI is
 * unreachable, so log lines are forwarded to the main thread via postMessage and
 * re-emitted there (DataWorkerBridge handles `type: "log"`).
 */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "trakt-authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

// Workers have no `window`; this picks the log sink (forward vs. log directly).
const inWorker = typeof window === "undefined";

const isNetDebugEnabled = (): boolean => {
  try {
    // Default ON; only an explicit `netDebug = false` disables it.
    return Storage.get<boolean>("netDebug", true) !== false;
  } catch {
    return true;
  }
};

const redactValue = (key: string, value: string): string => {
  if (!SENSITIVE_HEADERS.has(key.toLowerCase())) return value;
  const scheme = value.split(" ")[0];
  return /^(bearer|basic)$/i.test(scheme) ? `${scheme} ***redacted***` : "***redacted***";
};

const formatHeaders = (headers?: HeadersInit): string => {
  if (!headers) return " (none)";
  const h = headers instanceof Headers ? headers : new Headers(headers);
  const lines: string[] = [];
  h.forEach((value, key) => lines.push(`    ${key}: ${redactValue(key, value)}`));
  return lines.length ? "\n" + lines.join("\n") : " (none)";
};

const emit = (level: "info" | "error", message: string) => {
  if (inWorker) {
    (self as unknown as { postMessage(message: unknown): void }).postMessage({
      type: "log",
      level,
      message,
    });
  } else if (level === "error") {
    logger.error(message);
  } else {
    logger.log(message);
  }
};

export const loggedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!isNetDebugEnabled()) {
    return fetch(input, init);
  }

  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const method = (init?.method || "GET").toUpperCase();

  emit("info", `[net] → ${method} ${url}\n  request headers:${formatHeaders(init?.headers)}`);
  const started = Date.now();

  try {
    const res = await fetch(input, init);
    const ms = Date.now() - started;
    emit(
      "info",
      `[net] ← ${res.status} ${res.statusText} ${url} (${ms}ms)\n  response headers:${formatHeaders(res.headers)}`
    );
    return res;
  } catch (err) {
    const ms = Date.now() - started;
    emit("error", `[net] ✗ ${method} ${url} failed after ${ms}ms: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
};

import { consumeNdjsonChunk, parseBufferedNdjson, parseJsonLine } from "./ndjson";

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

export type HttpStreamEventHandler<T> = (event: T) => void;

export const HttpClient = {
  get<T = unknown>(url: string, headers?: Record<string, string>, timeoutMs?: number): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const hostOrigin = window.PotokInitialState?.hostOrigin || "*";

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (
          message &&
          message.source === 'potok-host' &&
          message.action === 'HTTP_RESPONSE' &&
          message.payload?.requestId === requestId
        ) {
          window.removeEventListener('message', handler);
          if (message.payload.error) {
            reject(new Error(message.payload.error));
          } else {
            resolve({ status: message.payload.status, data: message.payload.data });
          }
        }
      };

      window.addEventListener('message', handler);
      window.parent.postMessage(
        {
          source: 'potok-plugin-sdk',
          action: 'HTTP_REQUEST',
          payload: { requestId, url, method: 'GET', headers, timeoutMs }
        },
        hostOrigin
      );
    });
  },

  post<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    timeoutMs?: number,
  ): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const hostOrigin = window.PotokInitialState?.hostOrigin || "*";

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (
          message &&
          message.source === 'potok-host' &&
          message.action === 'HTTP_RESPONSE' &&
          message.payload?.requestId === requestId
        ) {
          window.removeEventListener('message', handler);
          if (message.payload.error) {
            reject(new Error(message.payload.error));
          } else {
            resolve({ status: message.payload.status, data: message.payload.data });
          }
        }
      };

      window.addEventListener('message', handler);
      window.parent.postMessage(
        {
          source: 'potok-plugin-sdk',
          action: 'HTTP_REQUEST',
          payload: { requestId, url, method: 'POST', body, headers, timeoutMs }
        },
        hostOrigin
      );
    });
  },

  /**
   * Request an EXTERNAL (cross-origin) URL through the gateway's server-side proxy. Browser `fetch` from a
   * plugin is CORS-limited; this routes the call server-side (no CORS), so any public API works. Supports
   * GET (default) and POST, and optional Referer/Origin spoofing for sites that check them.
   */
  proxy<T = unknown>(
    url: string,
    options?: {
      method?: 'GET' | 'POST';
      body?: unknown;
      headers?: Record<string, string>;
      referer?: string;
      origin?: string;
    }
  ): Promise<HttpResponse<T>> {
    let target = `/api/proxy?url=${encodeURIComponent(url)}`;
    if (options?.referer) target += `&referer=${encodeURIComponent(options.referer)}`;
    if (options?.origin) target += `&origin=${encodeURIComponent(options.origin)}`;
    return options?.method === 'POST'
      ? HttpClient.post<T>(target, options?.body, options?.headers)
      : HttpClient.get<T>(target, options?.headers);
  },

  /**
   * POST that yields NDJSON events as they arrive (via the host HTTP proxy).
   * Falls back to a buffered HTTP_RESPONSE if the host does not stream.
   */
  streamPost<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    timeoutMs?: number,
    onEvent?: HttpStreamEventHandler<T>,
  ): Promise<HttpResponse<T[]>> {
    return new Promise((resolve, reject) => {
      const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const hostOrigin = window.PotokInitialState?.hostOrigin || "*";
      const events: T[] = [];
      let status = 0;
      let buffer = "";
      let settled = false;

      const emit = (event: unknown) => {
        events.push(event as T);
        onEvent?.(event as T);
      };

      const finish = (error?: string) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", handler);
        if (error) {
          reject(new Error(error));
        } else {
          resolve({ status, data: events });
        }
      };

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (!message || message.source !== "potok-host" || message.payload?.requestId !== requestId) {
          return;
        }

        if (message.action === "HTTP_STREAM_START") {
          status = message.payload.status ?? 0;
          if (message.payload.error) finish(message.payload.error);
          return;
        }

        if (message.action === "HTTP_STREAM_CHUNK") {
          buffer = consumeNdjsonChunk(buffer, String(message.payload.chunk ?? ""), (line) => {
            const parsed = parseJsonLine(line);
            if (parsed !== undefined) emit(parsed);
          });
          return;
        }

        if (message.action === "HTTP_STREAM_DONE") {
          if (buffer.trim()) {
            const parsed = parseJsonLine(buffer.trim());
            if (parsed !== undefined) emit(parsed);
          }
          if (message.payload?.error) {
            finish(message.payload.error);
          } else {
            finish();
          }
          return;
        }

        if (message.action === "HTTP_RESPONSE") {
          if (message.payload.error) {
            finish(message.payload.error);
            return;
          }
          status = message.payload.status ?? 0;
          const raw = message.payload.data;
          const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
          parseBufferedNdjson(text, emit);
          finish();
        }
      };

      window.addEventListener("message", handler);
      window.parent.postMessage(
        {
          source: "potok-plugin-sdk",
          action: "HTTP_REQUEST",
          payload: { requestId, url, method: "POST", body, headers, timeoutMs, stream: true },
        },
        hostOrigin,
      );
    });
  },
};

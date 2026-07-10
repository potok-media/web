export interface HttpResponse<T = any> {
  status: number;
  data: T;
}

export const HttpClient = {
  get<T = any>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";

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
          payload: { requestId, url, method: 'GET', headers }
        },
        hostOrigin
      );
    });
  },

  post<T = any>(url: string, body?: any, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return new Promise((resolve, reject) => {
      const requestId = "req_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      const hostOrigin = (window as any).PotokInitialState?.hostOrigin || "*";

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
          payload: { requestId, url, method: 'POST', body, headers }
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
  proxy<T = any>(
    url: string,
    options?: {
      method?: 'GET' | 'POST';
      body?: any;
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
  }
};

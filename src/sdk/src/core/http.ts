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
  }
};

import { logger } from "../logger";
import { ApiClient } from "../../network/ApiClient";
import { Storage } from "../StorageService";

interface QueuedRequest {
  requestId: string;
  execute: () => Promise<void>;
}

class HttpProxyThrottleManager {
  private activeCounts = new Map<string, number>();
  private queues = new Map<string, QueuedRequest[]>();
  
  private readonly MAX_CONCURRENT = 15;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly DEFAULT_TIMEOUT_MS = 15000;

  public async handleRequest(
    pluginId: string,
    payload: any,
    permissions: string[],
    source: MessageEventSource,
    activeProfile: any
  ): Promise<void> {
    const { requestId, url, method, headers, body } = payload;
    const targetOrigin = "*"; // Safe target origin for null-origin sandboxed iframes

    if (!permissions.includes("http-proxy")) {
      (source as any).postMessage({
        source: "potok-host",
        action: "HTTP_RESPONSE",
        payload: { requestId, status: 403, data: "", error: "Отсутствует разрешение http-proxy в манифесте плагина" }
      }, targetOrigin);
      return;
    }

    const queue = this.getOrCreateQueue(pluginId);
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      (source as any).postMessage({
        source: "potok-host",
        action: "HTTP_RESPONSE",
        payload: { requestId, status: 429, data: "", error: "Превышен лимит очереди запросов плагина (Queue Saturated)" }
      }, targetOrigin);
      return;
    }

    const requestPromise = new Promise<void>((resolve, reject) => {
      queue.push({
        requestId,
        execute: async () => {
          const startTime = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            logger.warn(`[PluginSandbox] HTTP Request timed out after 15s: ${url}`);
            controller.abort();
          }, this.DEFAULT_TIMEOUT_MS);

          try {
            let finalUrl = url;
            const isProxy = url.startsWith("/api/proxy?url=");
            const shouldBypass = Storage.get<boolean>("disableHttpProxy", true);

            if (isProxy && shouldBypass) {
              const searchParams = new URLSearchParams(url.slice(url.indexOf("?") + 1));
              const rawUrl = searchParams.get("url");
              if (rawUrl) {
                finalUrl = rawUrl;
              }
            } else if (url.startsWith("/api/")) {
              const gatewayBase = (ApiClient.baseURL || activeProfile?.gatewayURL || "")
                .trim()
                .replace(/\/+$/, "");
              
              let absoluteGateway = gatewayBase;
              if (absoluteGateway && !/^https?:\/\//i.test(absoluteGateway)) {
                absoluteGateway = `http://${absoluteGateway}`;
              }
              
              finalUrl = `${absoluteGateway}${url}`;
            }

            const mergedHeaders = {
              ...((url.startsWith("/api/") && !(isProxy && shouldBypass)) ? (ApiClient.headers as any) : {}),
              ...headers
            };

            const fetchOptions: RequestInit = { 
              method, 
              headers: mergedHeaders,
              signal: controller.signal
            };
            if (body) {
              fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
              if (!mergedHeaders || !mergedHeaders["Content-Type"]) {
                fetchOptions.headers = {
                  ...mergedHeaders,
                  "Content-Type": "application/json"
                };
              }
            }

            const res = await fetch(finalUrl, fetchOptions);
            clearTimeout(timeoutId);
            
            const responseStatus = res.status;
            const responseData = await res.text();
            
            logger.log(`[PluginSandbox] HTTP Success [${responseStatus}] in ${Date.now() - startTime}ms: ${url}`);

            (source as any).postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { requestId, status: responseStatus, data: responseData, error: null }
            }, targetOrigin);
            resolve();
          } catch (err: any) {
            clearTimeout(timeoutId);
            const isAbort = err.name === 'AbortError';
            logger.error(`[PluginSandbox] HTTP Failed in ${Date.now() - startTime}ms: ${url}. Error: ${err.message}`);
            
            (source as any).postMessage({
              source: "potok-host",
              action: "HTTP_RESPONSE",
              payload: { 
                requestId, 
                status: isAbort ? 408 : 500, 
                data: "", 
                error: isAbort ? "Превышено время ожидания запроса (15s Timeout)" : (err.message || "HTTP request failed") 
              }
            }, targetOrigin);
            reject(err);
          }
        }
      });
    });

    this.processQueue(pluginId);
    try {
      await requestPromise;
    } catch (e) {}
  }

  private processQueue(pluginId: string) {
    const active = this.activeCounts.get(pluginId) || 0;
    const queue = this.queues.get(pluginId) || [];

    if (active >= this.MAX_CONCURRENT || queue.length === 0) return;

    const task = queue.shift()!;
    this.activeCounts.set(pluginId, active + 1);

    task.execute().finally(() => {
      const currentActive = this.activeCounts.get(pluginId) || 1;
      this.activeCounts.set(pluginId, Math.max(0, currentActive - 1));
      this.processQueue(pluginId);
    });
  }

  private getOrCreateQueue(pluginId: string): QueuedRequest[] {
    if (!this.queues.has(pluginId)) {
      this.queues.set(pluginId, []);
    }
    return this.queues.get(pluginId)!;
  }
}

const proxyThrottle = new HttpProxyThrottleManager();

export async function handleHttpProxyRequest(
  payload: any,
  permissions: string[],
  source: MessageEventSource,
  activeProfile: any,
  pluginId = "default-plugin"
) {
  await proxyThrottle.handleRequest(pluginId, payload, permissions, source, activeProfile);
}

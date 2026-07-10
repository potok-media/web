import { logger } from "../logger";
import { ApiClient } from "../../network/ApiClient";
import { Storage } from "../StorageService";
import {
  asPostMessageSource,
  type ConnectionProfile,
  type HttpProxyRequestPayload,
} from "./extensionHostTypes";

interface QueuedRequest {
  requestId: string;
  execute: () => Promise<void>;
}

interface HostHttpResponse {
  source: "potok-host";
  action: "HTTP_RESPONSE";
  payload: {
    requestId: string;
    status: number;
    data: string;
    error: string | null;
  };
}

class HttpProxyThrottleManager {
  private activeCounts = new Map<string, number>();
  private queues = new Map<string, QueuedRequest[]>();

  private readonly MAX_CONCURRENT = 15;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly DEFAULT_TIMEOUT_MS = 15000;

  public async handleRequest(
    pluginId: string,
    payload: HttpProxyRequestPayload,
    permissions: string[],
    source: MessageEventSource,
    activeProfile: ConnectionProfile | null,
  ): Promise<void> {
    const { requestId, url, method, headers, body } = payload;
    const targetOrigin = "*";
    const messageSource = asPostMessageSource(source);

    const sendResponse = (status: number, data: string, error: string | null) => {
      const message: HostHttpResponse = {
        source: "potok-host",
        action: "HTTP_RESPONSE",
        payload: { requestId, status, data, error },
      };
      messageSource?.postMessage(message, targetOrigin);
    };

    if (!permissions.includes("http-proxy")) {
      sendResponse(403, "", "Отсутствует разрешение http-proxy в манифесте плагина");
      return;
    }

    const queue = this.getOrCreateQueue(pluginId);
    if (queue.length >= this.MAX_QUEUE_SIZE) {
      sendResponse(429, "", "Превышен лимит очереди запросов плагина (Queue Saturated)");
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

            const gatewayBase = (ApiClient.baseURL || activeProfile?.gatewayURL || "")
              .trim()
              .replace(/\/+$/, "");
            let absoluteGateway = gatewayBase;
            if (absoluteGateway && !/^https?:\/\//i.test(absoluteGateway)) {
              absoluteGateway = `http://${absoluteGateway}`;
            }

            if (url.startsWith("/api/")) {
              // Host-relative gateway calls — including an EXPLICIT /api/proxy?url= (a plugin opting into the
              // server-side proxy). Always routed to the gateway so cross-origin targets bypass browser CORS,
              // regardless of the disableHttpProxy toggle (that toggle only governs AUTO-proxying below).
              finalUrl = `${absoluteGateway}${url}`;
            } else if (!shouldBypass && /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin)) {
              finalUrl = `${absoluteGateway}/api/proxy?url=${encodeURIComponent(url)}`;
            }

            // Attach the app's gateway auth headers only to first-party /api/ calls — never to /api/proxy,
            // whose headers are forwarded verbatim to the external target.
            const apiHeaders = url.startsWith("/api/") && !isProxy
              ? (ApiClient.headers as Record<string, string>)
              : {};
            const mergedHeaders: Record<string, string> = {
              ...apiHeaders,
              ...headers,
            };

            const fetchOptions: RequestInit = {
              method,
              headers: mergedHeaders,
              signal: controller.signal,
            };
            if (body) {
              fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
              if (!mergedHeaders["Content-Type"]) {
                fetchOptions.headers = {
                  ...mergedHeaders,
                  "Content-Type": "application/json",
                };
              }
            }

            const res = await fetch(finalUrl, fetchOptions);
            clearTimeout(timeoutId);

            const responseStatus = res.status;
            const responseData = await res.text();

            logger.log(`[PluginSandbox] HTTP Success [${responseStatus}] in ${Date.now() - startTime}ms: ${url}`);
            sendResponse(responseStatus, responseData, null);
            resolve();
          } catch (err: unknown) {
            clearTimeout(timeoutId);
            const isAbort = err instanceof Error && err.name === "AbortError";
            const message = err instanceof Error ? err.message : "HTTP request failed";
            logger.error(`[PluginSandbox] HTTP Failed in ${Date.now() - startTime}ms: ${url}. Error: ${message}`);
            sendResponse(
              isAbort ? 408 : 500,
              "",
              isAbort ? "Превышено время ожидания запроса (15s Timeout)" : message,
            );
            reject(err);
          }
        },
      });
    });

    this.processQueue(pluginId);
    try {
      await requestPromise;
    } catch {
      // Failure already logged and HTTP_RESPONSE sent to the plugin; drain queue.
    }
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
  payload: HttpProxyRequestPayload,
  permissions: string[],
  source: MessageEventSource,
  activeProfile: ConnectionProfile | null,
  pluginId = "default-plugin",
) {
  await proxyThrottle.handleRequest(pluginId, payload, permissions, source, activeProfile);
}
import { logger } from "../logger";

export async function handleHttpProxyRequest(
  payload: any,
  permissions: string[],
  source: MessageEventSource,
  activeProfile: any
) {
  const { requestId, url, method, headers, body } = payload;
  if (!permissions.includes("http-proxy")) {
    (source as any).postMessage({
      source: "potok-host",
      action: "HTTP_RESPONSE",
      payload: { requestId, status: 403, data: "", error: "Отсутствует разрешение http-proxy в манифесте плагина" }
    }, "*");
    return;
  }
  
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn(`[PluginSandbox] HTTP Request timed out after 15s: ${url}`);
    controller.abort();
  }, 15000);

  try {
    let finalUrl = url;
    if (url.startsWith("/api/")) {
      const gatewayBase = activeProfile?.gatewayURL 
        ? (activeProfile.gatewayURL.endsWith("/") ? activeProfile.gatewayURL.slice(0, -1) : activeProfile.gatewayURL)
        : "";
      
      let absoluteGateway = gatewayBase;
      if (absoluteGateway && !/^https?:\/\//i.test(absoluteGateway)) {
        absoluteGateway = `http://${absoluteGateway}`;
      }
      
      finalUrl = `${absoluteGateway}${url}`;
      logger.log(`[PluginSandbox] Rewrote relative API url: ${url} -> ${finalUrl}`);
    }

    const fetchOptions: RequestInit = { 
      method, 
      headers,
      signal: controller.signal
    };
    if (body) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!headers || !headers["Content-Type"]) {
        fetchOptions.headers = {
          ...headers,
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
    }, "*");
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
    }, "*");
  }
}

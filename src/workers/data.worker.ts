import { ApiClient } from "../network/ApiClient";
import { SyncApiClient } from "../network/SyncApiClient";
import { webSocketClient } from "../network/WebSocketClient";
import { SettingsService } from "../utils/SettingsService";
import { logger } from "../utils/logger";

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case "sync_settings": {
      if (msg.settings) {
        SettingsService.applySnapshot(msg.settings);
        logger.log(`[worker] effective baseURL: ${ApiClient.baseURL || "(empty)"}`);
      }
      break;
    }

    case "api_request": {
      const { id, method, args, settings } = msg;
      try {
        if (settings) SettingsService.applySnapshot(settings);
        let apiMethod;
        let context;
        if (method.startsWith("sync_")) {
          const actualMethod = method.substring(5);
          apiMethod = (SyncApiClient as any)[actualMethod];
          context = SyncApiClient;
        } else {
          apiMethod = (ApiClient as any)[method];
          context = ApiClient;
        }
        if (typeof apiMethod !== "function") {
          throw new Error(`Method ${method} not found`);
        }
        const result = await apiMethod.apply(context, args);
        self.postMessage({ type: "api_response", id, success: true, result });
      } catch (err: any) {
        self.postMessage({
          type: "api_response",
          id,
          success: false,
          error: {
            message: err.message || "Unknown error",
            status: err.status,
            errorText: err.errorText
          }
        });
      }
      break;
    }
    
    case "ws_start": {
      webSocketClient.startListening(msg.url);
      break;
    }
    
    case "ws_stop": {
      webSocketClient.stopListening();
      break;
    }
    
    case "ws_send": {
      webSocketClient.send(msg.event, msg.payload);
      break;
    }
    
    case "ws_online": {
      (webSocketClient as any).reconnect();
      break;
    }
    
    case "ws_offline": {
      webSocketClient.stopListening();
      break;
    }
    
    case "ws_visible": {
      (webSocketClient as any).reconnect();
      break;
    }
    
    case "invalidate_cache": {
      ApiClient.invalidateCache();
      break;
    }
  }
};

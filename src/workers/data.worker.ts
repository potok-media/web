import { ApiClient } from "../network/ApiClient";
import { webSocketClient } from "../network/WebSocketClient";
import { SettingsService } from "../utils/SettingsService";
import { logger } from "../utils/logger";
import { dispatchWorkerApiRequest } from "../utils/worker/workerApiDispatch";

interface WorkerApiError {
  message: string;
  status?: number;
  errorText?: string;
}

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
        const result = await dispatchWorkerApiRequest(method, args);
        self.postMessage({ type: "api_response", id, success: true, result });
      } catch (err: unknown) {
        const apiErr = err as WorkerApiError;
        const message = err instanceof Error ? err.message : "Unknown error";
        self.postMessage({
          type: "api_response",
          id,
          success: false,
          error: {
            message,
            status: apiErr.status,
            errorText: apiErr.errorText,
          },
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
      webSocketClient.requestReconnect();
      break;
    }

    case "ws_offline": {
      webSocketClient.stopListening();
      break;
    }

    case "ws_visible": {
      webSocketClient.requestReconnect();
      break;
    }

    case "invalidate_cache": {
      ApiClient.invalidateCache();
      break;
    }
  }
};
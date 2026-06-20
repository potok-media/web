import { ApiError } from "../../network/ApiTypes";
import { WebSocketClient, webSocketClient } from "../../network/WebSocketClient";
import { Storage } from "../StorageService";
import { logger } from "../logger";

class WorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private requestCounter = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker(new URL("../../workers/data.worker.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.type) return;

        switch (msg.type) {
          case "api_response": {
            const pending = this.pendingRequests.get(msg.id);
            if (pending) {
              this.pendingRequests.delete(msg.id);
              if (msg.success) {
                pending.resolve(msg.result);
              } else {
                const errData = msg.error;
                if (errData && errData.status !== undefined) {
                  pending.reject(new ApiError(errData.message, errData.status, errData.errorText));
                } else {
                  pending.reject(new Error(errData?.message || "Unknown worker error"));
                }
              }
            }
            break;
          }
          case "log": {
            // Re-emit a log line forwarded from the worker (e.g. fetchLogger) so it
            // reaches the main-thread console + in-app Console viewer.
            if (msg.level === "error") {
              logger.error(msg.message);
            } else {
              logger.log(msg.message);
            }
            break;
          }
          case "ws_event": {
            webSocketClient.triggerLocalEvent(msg.event, msg.payload);
            break;
          }
          case "ws_state_change": {
            webSocketClient.setLocalState(msg.state);
            if (msg.state === "CONNECTED") {
              webSocketClient.triggerLocalEvent("connected", "");
            } else if (msg.state === "DISCONNECTED" || msg.state === "RECONNECTING") {
              webSocketClient.triggerLocalEvent("offline", "");
            }
            break;
          }
        }
      };

      // Set bridge delegate on webSocketClient to break circular static import dependency
      WebSocketClient.setBridgeDelegate(this);

      this.syncSettings();
    } catch (err) {
      console.error("[DataWorkerBridge] Failed to initialize Web Worker:", err);
    }
  }

  public syncSettings() {
    if (!this.worker) return;
    
    const settings = {
      activeProfileID: Storage.get<string | null>("activeProfileID", null),
      connectionProfiles: Storage.get<any[]>("connectionProfiles", []),
      potokToken: Storage.get<string | null>("potokToken", null),
      traktAccessToken: Storage.get<string | null>("traktAccessToken", null),
      syncStrategy: Storage.get<string>("syncStrategy", "none"),
      potok_client_id: webSocketClient.clientId,
      netDebug: Storage.get<boolean>("netDebug", true),

      "potok_plugin:scoped:potok-torrents:playerServerURL": Storage.get<string>("potok_plugin:scoped:potok-torrents:playerServerURL", ""),
      "potok_plugin:scoped:potok-torrents:torrentGoURL": Storage.get<string>("potok_plugin:scoped:potok-torrents:torrentGoURL", ""),
    };

    this.worker.postMessage({ type: "sync_settings", settings });
  }

  public request<T>(method: string, args: any[]): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker not initialized"));
    }

    const id = `${method}_${++this.requestCounter}_${Math.random().toString(36).substring(2)}`;
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ type: "api_request", id, method, args });
    });
  }

  public postToWorker(msg: any) {
    if (this.worker) {
      this.worker.postMessage(msg);
    }
  }
}

export const DataWorkerBridge = new WorkerBridge();

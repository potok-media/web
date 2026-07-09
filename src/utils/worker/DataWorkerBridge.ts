import { ApiError } from "../../network/ApiTypes";
import { WebSocketClient, webSocketClient } from "../../network/WebSocketClient";
import type { WorkerOutboundMessage } from "../../network/wsTypes";
import { SettingsService } from "../SettingsService";
import { logger } from "../logger";

class WorkerBridge {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (val: unknown) => void;
    reject: (err: Error) => void;
  }>();
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

      WebSocketClient.setBridgeDelegate(this);
      this.syncSettings();
    } catch (err) {
      logger.error("[DataWorkerBridge] Failed to initialize Web Worker:", err);
    }
  }

  private collectSettings() {
    return {
      ...SettingsService.snapshot(),
      potok_client_id: webSocketClient.clientId,
    };
  }

  public syncSettings() {
    if (!this.worker) return;
    this.worker.postMessage({ type: "sync_settings", settings: this.collectSettings() });
  }

  public request<T>(method: string, args: unknown[]): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error("Worker not initialized"));
    }

    const id = `${method}_${++this.requestCounter}_${Math.random().toString(36).substring(2)}`;
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: (val) => resolve(val as T),
        reject,
      });
      this.worker!.postMessage({
        type: "api_request",
        id,
        method,
        args,
        settings: this.collectSettings(),
      });
    });
  }

  public postToWorker(msg: WorkerOutboundMessage) {
    if (this.worker) {
      this.worker.postMessage(msg);
    }
  }
}

export const DataWorkerBridge = new WorkerBridge();
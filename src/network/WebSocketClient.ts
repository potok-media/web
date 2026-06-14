import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { logger } from "../utils/logger";
import { Storage } from "../utils/StorageService";

type WSCallback = (data: string) => void;

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private connection: HubConnection | null = null;
  private rawUrl: string | null = null;
  private listeners: Record<string, Set<WSCallback>> = {};
  
  // Strict ConnectionState machine
  private state: ConnectionState = "DISCONNECTED";
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private maxRetryDelay = 30000;

  public static get shared(): WebSocketClient {
    if (!this.instance) {
      this.instance = new WebSocketClient();
    }
    return this.instance;
  }

  public get clientId(): string {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("potok_client_id");
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("potok_client_id", id);
    }
    return id;
  }

  private constructor() {
    // Proactively listen to browser network state changes
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        logger.log("[WS] Browser went online. Reconnecting SignalR...");
        this.reconnect();
      });

      window.addEventListener("offline", () => {
        logger.log("[WS] Browser went offline. Stopping SignalR...");
        this.stopListening();
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          logger.log("[WS] Tab became visible. Checking SignalR state...");
          if (!this.connection || this.connection.state === HubConnectionState.Disconnected) {
            this.reconnect();
          }
        }
      });
    }
  }

  private transitionTo(newState: ConnectionState): void {
    logger.log(`[WS] State transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  public subscribe(event: string, callback: WSCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);

    return () => {
      this.listeners[event]?.delete(callback);
      if (this.listeners[event]?.size === 0) {
        delete this.listeners[event];
      }
    };
  }

  public startListening(rawUrl: string): void {
    if (!rawUrl || !rawUrl.trim()) {
      logger.log("[WS] No gateway URL provided. Stopping active listener...");
      this.stopListening();
      return;
    }
    this.rawUrl = rawUrl;
    this.connect();
  }

  private getFullUrl(): string {
    if (!this.rawUrl) return "";
    
    let wsUrl = this.rawUrl.trim().replace(/\/$/, "");
    if (wsUrl.startsWith("//")) {
      const cleaned = wsUrl.replace(/^\/+/, "");
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      wsUrl = `${protocol}//${cleaned}`;
    } else if (wsUrl.startsWith("wss://")) {
      wsUrl = wsUrl.replace("wss://", "https://");
    } else if (wsUrl.startsWith("ws://")) {
      wsUrl = wsUrl.replace("ws://", "http://");
    } else if (!wsUrl.startsWith("http://") && !wsUrl.startsWith("https://")) {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      wsUrl = `${protocol}//${wsUrl}`;
    }

    let fullUrl = `${wsUrl}/api/events`;
    fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");
    return fullUrl;
  }

  private async connect(): Promise<void> {
    if (!this.rawUrl) return;
    if (this.connection && (this.connection.state === HubConnectionState.Connected || this.connection.state === HubConnectionState.Connecting)) {
      return;
    }

    this.transitionTo("CONNECTING");
    const fullUrl = this.getFullUrl();

    logger.log(`[WS] Connecting to SignalR Hub at: ${fullUrl}`);

    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (err) {
        logger.error("[WS] Error stopping existing SignalR connection:", err);
      }
      this.connection = null;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(fullUrl, {
        accessTokenFactory: () => {
          const token = Storage.get<string | null>("potokToken", null);
          return token || "";
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          const jitter = Math.floor(Math.random() * 1500);
          const delay = Math.min(Math.pow(2, retryContext.previousRetryCount) * 1000, 30000) + jitter;
          logger.log(`[WS] SignalR reconnect attempt #${retryContext.previousRetryCount + 1} in ${delay}ms...`);
          return delay;
        }
      })
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on("ReceiveEvent", (frame: any) => {
      try {
        if (!frame || !frame.event) return;
        logger.log(`[WS] Event: ${frame.event} [TraceId: ${frame.traceId}]`);
        this.trigger(frame.event, typeof frame.payload === "string" ? frame.payload : JSON.stringify(frame.payload));
      } catch (err) {
        logger.error("[WS] Error processing ReceiveEvent frame:", err, frame);
      }
    });

    this.connection.onreconnecting((error) => {
      logger.warn("[WS] SignalR connection lost. Reconnecting...", error);
      this.transitionTo("RECONNECTING");
      this.trigger("offline", "");
    });

    this.connection.onreconnected((connectionId) => {
      logger.log("[WS] SignalR connection re-established. Connection ID:", connectionId);
      this.transitionTo("CONNECTED");
      this.trigger("connected", "");
    });

    this.connection.onclose((error) => {
      logger.warn("[WS] SignalR connection closed.", error);
      this.transitionTo("DISCONNECTED");
      this.trigger("offline", "");
    });

    try {
      await this.connection.start();
      logger.log("[WS] SignalR connected successfully!");
      this.transitionTo("CONNECTED");
      this.retryCount = 0;
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      this.trigger("connected", "");
    } catch (err) {
      logger.error("[WS] SignalR connection failed to start:", err);
      this.transitionTo("DISCONNECTED");
      this.trigger("offline", "");
      
      if (window.location.protocol === "https:" && fullUrl.startsWith("http://")) {
        logger.error(
          "[WS] SSL Mismatch: Insecure connection blocked on HTTPS origin."
        );
        this.trigger("error:ssl_mismatch", "SSL Mismatch: Insecure connection blocked on HTTPS page.");
      }

      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      logger.log("[WS] Network is currently down. Delaying reconnect until browser is online.");
      return;
    }

    const jitter = Math.floor(Math.random() * 1500);
    const delay = Math.min(Math.pow(2, this.retryCount) * 1000, this.maxRetryDelay) + jitter;
    logger.log(`[WS] Scheduling initial connection retry #${this.retryCount + 1} in ${delay}ms...`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }

  private reconnect(force = false): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (force) {
      this.transitionTo("DISCONNECTED");
      this.retryCount = 0;
    }
    if (this.rawUrl) {
      this.connect();
    }
  }

  public async stopListening(): Promise<void> {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.retryCount = 0;

    if (this.connection) {
      const conn = this.connection;
      this.connection = null;
      try {
        await conn.stop();
      } catch (err) {
        logger.error("[WS] Error stopping SignalR connection cleanly:", err);
      }
    }
    this.transitionTo("DISCONNECTED");
    this.trigger("offline", "");
    logger.log("[WS] SignalR listener stopped completely.");
  }

  public send(event: string, payload: any): void {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      this.connection.send("SendEvent", event, payload).catch(err => {
        logger.error("[WS] Failed to send message to SignalR:", err);
      });
    } else {
      logger.warn("[WS] Cannot send message: SignalR is not connected.");
    }
  }

  private trigger(event: string, data: string): void {
    this.listeners[event]?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        logger.error(`[WS] Error executing callback for event "${event}":`, err);
      }
    });
  }

  public get currentState(): ConnectionState {
    return this.state;
  }
}

export const webSocketClient = WebSocketClient.shared;

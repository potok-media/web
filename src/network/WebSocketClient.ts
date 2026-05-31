import { logger } from "../utils/logger";

type WSCallback = (data: string) => void;

interface WSMessageFrame {
  event: string;
  payload: string;
  timestamp: string;
  version: string;
  traceId: string;
}

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

export class WebSocketClient {
  private static instance: WebSocketClient | null = null;
  private socket: WebSocket | null = null;
  private currentUrl: string | null = null;
  private rawUrl: string | null = null;
  private listeners: Record<string, Set<WSCallback>> = {};
  
  // Strict ConnectionState machine
  private state: ConnectionState = "DISCONNECTED";
  // Single AbortController to manage events
  private abortController: AbortController | null = null;

  // Reconnection state
  private retryCount = 0;
  private maxRetryDelay = 30000;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;

  public static get shared(): WebSocketClient {
    if (!this.instance) {
      this.instance = new WebSocketClient();
    }
    return this.instance;
  }

  private constructor() {
    // Proactively listen to browser network state changes
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        logger.log("[WS] Browser went online. Proactively reconnecting WebSocket...");
        this.reconnect(true);
      });

      window.addEventListener("offline", () => {
        logger.log("[WS] Browser went offline. Proactively clearing timers and closing WebSocket...");
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = null;
        }
        this.stopPingInterval();
        if (this.socket) {
          try {
            this.socket.onclose = null;
            this.socket.close(1000, "Normal closure");
          } catch (err) {
            // ignore
          }
          this.socket = null;
        }
        this.transitionTo("DISCONNECTED");
      });

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          logger.log("[WS] Tab became visible. Re-validating WebSocket state...");
          if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            this.reconnect(true);
          }
        }
      });
    }
  }

  private transitionTo(newState: ConnectionState): void {
    logger.log(`[WS] State transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ event: "ping", payload: "" }));
        } catch (e) {
          logger.error("[WS] Failed to send ping:", e);
        }
      }
    }, 15000);
  }

  private stopPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
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

    // Convert HTTP schema to WS/WSS schema
    let wsUrl = rawUrl.trim().replace(/\/$/, "");
    if (wsUrl.startsWith("https://")) {
      wsUrl = wsUrl.replace("https://", "wss://");
    } else if (wsUrl.startsWith("http://")) {
      wsUrl = wsUrl.replace("http://", "ws://");
    } else {
      // Fallback protocol-less address
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${wsUrl}`;
    }

    const fullUrl = `${wsUrl}/api/events`;

    // Avoid duplicating exact same active socket
    if (this.socket) {
      if (this.currentUrl === fullUrl && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        return;
      }
      this.stopListening();
    }

    this.currentUrl = fullUrl;
    this.connect();
  }

  private connect(): void {
    if (!this.currentUrl || this.state === "CONNECTING" || this.state === "CONNECTED") return;
    this.transitionTo("CONNECTING");

    logger.log(`[WS] Connecting to WebSocket at ${this.currentUrl}...`);

    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.close(1000, "Normal closure");
      } catch (err) {
        logger.error("[WS] Failed to close WebSocket before reconnecting:", err);
      }
      this.socket = null;
    }

    // Clean up previous abortController if any
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const ws = new WebSocket(this.currentUrl);
      this.socket = ws;

      ws.addEventListener("open", () => {
        if (signal.aborted) return;
        logger.log("[WS] WebSocket connected successfully!");
        this.transitionTo("CONNECTED");
        this.retryCount = 0;
        this.trigger("connected", "");
        this.startPingInterval();
      }, { signal });

      ws.addEventListener("message", (event: MessageEvent) => {
        if (signal.aborted) return;
        try {
          const frame: WSMessageFrame = JSON.parse(event.data);
          logger.log(`[WS] Event: ${frame.event} [TraceId: ${frame.traceId}]`);
          this.trigger(frame.event, frame.payload);
        } catch (err) {
          logger.warn("[WS] Received raw frame that failed parser schema validation:", event.data, err);
          this.trigger("message", event.data);
        }
      }, { signal });

      ws.addEventListener("error", () => {
        if (signal.aborted) return;
        logger.warn("[WS] Connection encountered an error.");
      }, { signal });

      ws.addEventListener("close", (event) => {
        if (signal.aborted) return;
        this.socket = null;
        this.stopPingInterval();
        this.trigger("offline", "");
        
        if (event.wasClean) {
          logger.log("[WS] Connection closed cleanly by client or host.");
          this.transitionTo("DISCONNECTED");
        } else {
          logger.warn("[WS] Connection lost abruptly. Scheduling auto-reconnect...");
          this.transitionTo("RECONNECTING");
          this.scheduleReconnect();
        }
      }, { signal });
    } catch (e) {
      this.socket = null;
      logger.error("[WS] Connection attempt threw synchronous exception:", e);
      this.transitionTo("RECONNECTING");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    if (navigator.onLine === false) {
      logger.log("[WS] Network is currently down. Delaying reconnect until browser is online.");
      return;
    }

    // Exponential Backoff retry delay
    const delay = Math.min(Math.pow(2, this.retryCount) * 1000, this.maxRetryDelay);
    logger.log(`[WS] Scheduling reconnect attempt #${this.retryCount + 1} in ${delay}ms...`);
    
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
      this.startListening(this.rawUrl);
    }
  }

  public stopListening(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.stopPingInterval();

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.socket) {
      try {
        this.socket.onclose = null;
        this.socket.close(1000, "Normal closure");
      } catch (err) {
        logger.error("[WS] Failed to close WebSocket cleanly:", err);
      }
      this.socket = null;
    }

    this.currentUrl = null;
    this.retryCount = 0;
    this.transitionTo("DISCONNECTED");
    logger.log("[WS] WebSocket listener stopped completely.");
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

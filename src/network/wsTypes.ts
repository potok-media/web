export interface WsEventFrame {
  event: string;
  payload: string | Record<string, unknown>;
  traceId?: string;
}

export interface WorkerBridgeDelegate {
  postToWorker(msg: WorkerOutboundMessage): void;
}

export type WorkerOutboundMessage =
  | { type: "ws_start"; url: string }
  | { type: "ws_stop" }
  | { type: "ws_send"; event: string; payload: unknown }
  | { type: "ws_online" }
  | { type: "ws_offline" }
  | { type: "ws_visible" }
  | { type: "sync_settings"; settings: Record<string, unknown> }
  | { type: "api_request"; id: string; method: string; args: unknown[]; settings: Record<string, unknown> }
  | { type: "invalidate_cache" };
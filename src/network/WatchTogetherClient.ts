import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { logger } from "../utils/logger";
import { Storage } from "../utils/StorageService";
import { buildGatewayHubUrl } from "./gatewayWsUrl";
import type { WTConnectionState, WTMessage, WTRole } from "./watchTogetherTypes";

const HUB_PATH = "/api/watch-together";

// Dedicated, main-thread SignalR client for co-watching. Unlike WebSocketClient it is NOT worker-bridged and
// applies no shouldProcessEvent filtering — the co-watch hub already uses OthersInGroup, so there is nothing
// to de-echo, and the ~1 Hz sync stream must not be throttled. Owned by WatchTogetherContext (one instance
// per co-watch session), not a global singleton.
export class WatchTogetherClient {
  private connection: HubConnection | null = null;
  private activeRoomId: string | null = null;
  private member: { participantId: string; role: WTRole } | null = null; // for re-join on reconnect
  private messageHandlers = new Set<(msg: WTMessage) => void>();
  private stateHandlers = new Set<(state: WTConnectionState) => void>();
  // Set when WE close the connection on purpose (disconnect()/leave). Distinguishes an intentional close
  // from server/network/page-teardown closes when diagnosing "host disappeared" reports.
  private intentionalStop = false;

  onMessage(handler: (msg: WTMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: (state: WTConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  async connect(gatewayUrl: string): Promise<void> {
    const url = buildGatewayHubUrl(gatewayUrl, HUB_PATH);
    if (!url) {
      logger.warn("[WT] No gateway URL provided; not connecting.");
      return;
    }
    if (
      this.connection &&
      (this.connection.state === HubConnectionState.Connected ||
        this.connection.state === HubConnectionState.Connecting)
    ) {
      return;
    }

    this.emitState("connecting");
    this.connection = new HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => Storage.get<string | null>("potokToken", null) || "" })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) => {
          const jitter = Math.floor(Math.random() * 1500);
          return Math.min(Math.pow(2, ctx.previousRetryCount) * 1000, 30000) + jitter;
        },
      })
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on("WatchTogetherMessage", (json: string) => this.dispatch(json));
    this.connection.onreconnecting((error) => {
      logger.warn("[WT] connection lost, reconnecting:", error?.message ?? "no error detail");
      this.emitState("reconnecting");
    });
    this.connection.onreconnected(async (connectionId) => {
      logger.log("[WT] reconnected as", connectionId);
      this.emitState("connected");
      // Group membership is per-connection and is lost on reconnect — rejoin the active room.
      if (this.activeRoomId && this.member) {
        await this.invokeJoin(this.activeRoomId, this.member.participantId, this.member.role);
      }
    });
    this.connection.onclose((error) => {
      // The single most useful line when a co-watch room "dies by itself": was this close ours
      // (leave/navigation) or external (server/network/browser teardown)?
      if (this.intentionalStop) {
        logger.log("[WT] connection closed (intentional)");
      } else {
        logger.error(
          "[WT] connection closed EXTERNALLY — not initiated by the client. Error:",
          error?.message ?? "none",
          "State-before-close and pagehide breadcrumbs may follow.",
        );
      }
      this.intentionalStop = false;
      this.emitState("idle");
    });

    try {
      await this.connection.start();
      this.emitState("connected");
      logger.log(`[WT] connected to ${url}`);
    } catch (err) {
      logger.error("[WT] Connection failed:", err);
      this.emitState("idle");
      throw err;
    }
  }

  async joinRoom(roomId: string, participantId: string, role: WTRole): Promise<void> {
    this.activeRoomId = roomId;
    this.member = { participantId, role };
    await this.invokeJoin(roomId, participantId, role);
  }

  async leaveRoom(roomId: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.send("LeaveRoom", roomId);
      } catch (err) {
        logger.error("[WT] LeaveRoom failed:", err);
      }
    }
    if (this.activeRoomId === roomId) {
      this.activeRoomId = null;
      this.member = null;
    }
  }

  broadcast(roomId: string, msg: WTMessage): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) {
      logger.warn(`[WT] Cannot broadcast ${msg.type}: not connected.`);
      return Promise.resolve();
    }
    return this.connection.send("Broadcast", roomId, JSON.stringify(msg)).catch((err) => {
      logger.error("[WT] Broadcast failed:", err);
    });
  }

  async disconnect(): Promise<void> {
    this.activeRoomId = null;
    this.member = null;
    const conn = this.connection;
    this.connection = null;
    this.intentionalStop = true;
    if (conn) {
      try {
        await conn.stop();
      } catch (err) {
        logger.error("[WT] Error stopping connection:", err);
      }
    }
    this.emitState("idle");
  }

  private async invokeJoin(roomId: string, participantId: string, role: WTRole): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) return;
    try {
      // invoke (not send) so JoinRoom completes server-side before the caller broadcasts into the room.
      await this.connection.invoke("JoinRoom", roomId, participantId, role);
    } catch (err) {
      logger.error("[WT] JoinRoom failed:", err);
    }
  }

  private dispatch(json: string): void {
    let msg: WTMessage;
    try {
      msg = JSON.parse(json) as WTMessage;
    } catch (err) {
      logger.error("[WT] Failed to parse message:", err, json);
      return;
    }
    this.messageHandlers.forEach((h) => {
      try {
        h(msg);
      } catch (err) {
        logger.error("[WT] Message handler error:", err);
      }
    });
  }

  private emitState(state: WTConnectionState): void {
    this.stateHandlers.forEach((h) => h(state));
  }
}

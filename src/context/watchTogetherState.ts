import { createContext, useContext } from "react";
import type { ActivePlayback } from "./playbackTypes";
import type {
  ChatMessage,
  GuestPermissions,
  WTConnectionState,
  WTControl,
  WTNotice,
  WTNoticeAction,
  WTParticipant,
  WTPong,
  WTRole,
  WTSessionInfo,
  WTSyncWatch,
} from "../network/watchTogetherTypes";
import { NO_PERMISSIONS } from "../network/watchTogetherTypes";

export interface WatchTogetherContextType {
  roomId: string | null;
  role: WTRole | null;
  sessionActive: boolean;
  participants: WTParticipant[];
  pendingDescriptor: ActivePlayback | null;
  connectionState: WTConnectionState;
  hostEnded: boolean;
  hostPaused: boolean;
  hostPausedBy: string | null; // participant id who caused the current pause
  hostStarted: boolean;
  myName: string; // this participant's display name (editable)
  startGateOpen: boolean;
  guestPermissions: GuestPermissions; // host: what guests are allowed to do
  myPermissions: GuestPermissions; // guest: what THIS guest was granted
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  clientId: string;
  sessionInfo: WTSessionInfo | null; // what's being watched, for the lobby banner/playlist
  pings: Record<string, number>; // participant id → measured round-trip latency to the host (ms)
  roomUnavailable: boolean; // guest joined a room with no live host (stale link) — terminal state
  createRoom: (descriptor: ActivePlayback) => void;
  joinAsGuest: (token: string) => void;
  startWatch: () => void;
  hostAnnounceEpisode: (descriptor: ActivePlayback) => void; // host: re-broadcast + re-arm gate on episode change
  hostAwaitResync: () => void; // host: re-arm the ready-gate after a seek (hold until guests re-buffer)
  leave: () => void;
  onSyncMessage: (cb: (m: WTSyncWatch) => void) => () => void;
  emitSync: (sync: Omit<WTSyncWatch, "type" | "senderId" | "role">) => void;
  emitNotice: (action: WTNoticeAction, detail?: string, actorId?: string) => void;
  onNotice: (cb: (n: WTNotice) => void) => () => void;
  sendGuestReady: (round: number) => void;
  sendPing: () => void; // guest: probe the host for clock-offset / RTT estimation
  onPong: (cb: (p: WTPong) => void) => () => void; // guest: receive the host's pong reply
  reportPing: (rttMs: number) => void; // guest: publish its measured RTT to the room
  setGuestPermissions: (perms: GuestPermissions) => void; // host: update + broadcast
  sendControl: (action: WTControl["action"], time?: number, index?: number) => void; // guest: request control
  onControl: (cb: (c: WTControl) => void) => () => void; // host: receive allowed control
  setMyName: (name: string) => void;
  dismissHostEnded: () => void; // guest: acknowledge the "host closed the room" modal
  dismissRoomUnavailable: () => void; // guest: acknowledge the "room unavailable" state
  sendChat: (text: string) => void;
  setChatOpen: (open: boolean) => void;
  getShareLink: () => string;
}

// A no-op fallback so components rendered outside the provider (defensive paths) don't crash.
const NOOP_CONTEXT: WatchTogetherContextType = {
  roomId: null,
  role: null,
  sessionActive: false,
  participants: [],
  pendingDescriptor: null,
  connectionState: "idle",
  hostEnded: false,
  hostPaused: false,
  hostPausedBy: null,
  hostStarted: false,
  myName: "",
  startGateOpen: true,
  guestPermissions: NO_PERMISSIONS,
  myPermissions: NO_PERMISSIONS,
  chatMessages: [],
  chatOpen: false,
  clientId: "",
  sessionInfo: null,
  pings: {},
  roomUnavailable: false,
  createRoom: () => {},
  joinAsGuest: () => {},
  startWatch: () => {},
  hostAnnounceEpisode: () => {},
  hostAwaitResync: () => {},
  leave: () => {},
  onSyncMessage: () => () => {},
  emitSync: () => {},
  emitNotice: () => {},
  onNotice: () => () => {},
  sendGuestReady: () => {},
  sendPing: () => {},
  onPong: () => () => {},
  reportPing: () => {},
  setGuestPermissions: () => {},
  sendControl: () => {},
  onControl: () => () => {},
  setMyName: () => {},
  dismissHostEnded: () => {},
  dismissRoomUnavailable: () => {},
  sendChat: () => {},
  setChatOpen: () => {},
  getShareLink: () => "",
};

export const WatchTogetherContext = createContext<WatchTogetherContextType | null>(null);

export function useWatchTogether(): WatchTogetherContextType {
  return useContext(WatchTogetherContext) ?? NOOP_CONTEXT;
}

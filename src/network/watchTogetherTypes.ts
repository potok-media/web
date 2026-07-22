import type { ActivePlayback } from "../context/playbackTypes";

// Wire protocol for the co-watch hub (/api/watch-together). Every message is a discriminated union member
// serialized to JSON and fanned out to the room via OthersInGroup (the sender never receives its own echo).

export type WTRole = "host" | "guest";

export interface WTBase {
  senderId: string;
  role: WTRole;
}

// What the host lets guests do. Configured on the host, sent to guests (in the invite-guest reply and on
// change). Default is nothing — a guest's pause/seek/timeline stay disabled until the host grants it.
export interface GuestPermissions {
  // All-or-nothing (like Teleparty et al.): when granted, guests can pause/resume, seek, and change the episode.
  canControl: boolean;
}

export const NO_PERMISSIONS: GuestPermissions = { canControl: false };

// Guest announces itself on join; the host replies with its own invite-guest so each side lists the other.
// The host's reply also carries the guest permissions in effect.
export interface WTInviteGuest extends WTBase {
  type: "invite-guest";
  id: string;
  name?: string;
  permissions?: GuestPermissions;
}

// Host → room: guest permissions changed.
export interface WTPermissions extends WTBase {
  type: "permissions";
  permissions: GuestPermissions;
}

// Any participant → room: display-name change.
export interface WTRename extends WTBase {
  type: "rename";
  id: string;
  name: string;
}

// Any participant → room: chat message.
export interface WTChat extends WTBase {
  type: "chat";
  text: string;
  name?: string;
}

// Client-side chat entry (not a wire message).
export interface ChatMessage {
  id: number;
  senderId: string;
  name: string;
  text: string;
  mine: boolean;
}

// Guest → host: a control request (reverse control). The host validates against the guest permissions and, if
// allowed, applies it to its own player — the resulting sync-watch then propagates to everyone.
export interface WTControl extends WTBase {
  type: "control";
  action: "pause" | "play" | "seek" | "episode";
  time?: number; // for "seek"
  index?: number; // playlist index for "episode"
}

// Host-authoritative start. Carries the full descriptor so the guest can playVideo() the same stream.
export interface WTStartWatch extends WTBase {
  type: "start-watch";
  time: number; // logical seconds.ms
  streamUrl: string;
  descriptor: ActivePlayback;
}

// Host periodic sync (~1 Hz). Only timeline + pause — NOT tracks: each guest picks their own audio/subtitles.
export interface WTSyncWatch extends WTBase {
  type: "sync-watch";
  time: number; // logical seconds.ms (seekOffset + video.currentTime)
  paused: boolean;
  pausedBy?: string; // participant id who caused the current pause (host itself, or a guest via control)
  round?: number; // coordinated-start round; bumps on start/episode/seek so guests re-run the ready-handshake
  hostTs?: number; // host wall-clock (Date.now) when `time` was sampled — lets guests extrapolate out WAN latency
}

// Clock-sync ping/pong (NTP/Cristian). A guest measures the round-trip + host↔guest clock offset so it can
// convert the host's timestamped sync into its own clock and cancel the one-way network delay.
export interface WTPing extends WTBase {
  type: "ping";
  t1: number; // guest send time (guest clock)
}

export interface WTPong extends WTBase {
  type: "pong";
  id: string; // the guest this pong answers (only that guest consumes it)
  t1: number; // echoed guest send time
  t2: number; // host receive time (host clock)
  t3: number; // host send time (host clock)
}

// Guest → room: its measured round-trip latency to the host, so the Info panel can show everyone's ping.
export interface WTPingReport extends WTBase {
  type: "ping-report";
  rttMs: number;
}

// Host closed the player / left the room.
export interface WTHostEnded extends WTBase {
  type: "host-ended";
}

// Server → a joining guest whose room has no live host (stale share link). Not from a peer — the hub emits it.
export interface WTNoHost {
  type: "no-host";
}

// A participant left the room.
export interface WTParticipantLeft extends WTBase {
  type: "participant-left";
  id: string;
}

// Guest → host: this guest has buffered the first bytes at the start position and is ready to begin. The host
// waits for every guest's ready (or a timeout) before releasing playback, so everyone starts together.
export interface WTGuestReady extends WTBase {
  type: "guest-ready";
  id: string;
  round?: number; // the round this ready is for (host ignores a ready from a stale round)
}

// A lightweight episode entry for the lobby playlist (not the full PlaylistItem — no stream URLs / headers).
export interface WTPlaylistEntry {
  season: number;
  episode: number;
  title?: string;
}

// What's being watched, shown on the connection/lobby page (banner + title + playlist). The host pushes this
// to the room when a guest joins so a waiting guest sees the content before the session starts.
export interface WTSessionInfo {
  title: string;
  backdropSrc?: string;
  posterSrc?: string;
  mediaType: "movie" | "tv";
  playlist?: WTPlaylistEntry[];
  playlistIndex?: number;
}

// Host → room: session metadata for the lobby.
export interface WTRoomInfo extends WTBase, WTSessionInfo {
  type: "room-info";
}

// Live playback state carried in a state-sync when a session is already running.
export interface WTSessionState {
  descriptor: ActivePlayback; // what to play
  round: number; // current coordinated round (so the joiner's ready-handshake targets it)
  time: number; // host's last-known playhead
  paused: boolean;
  pausedBy?: string; // who paused (for the pause overlay)
  hostStarted: boolean; // the session has really begun (vs. still in the start hold)
}

// Host → ONE new joiner (addressed by `to`; everyone else ignores it): the authoritative snapshot the host
// holds. Replaces the old broadcast-to-everyone catch-up that disrupted existing guests. Carries the full roster
// (host is the single source of truth for who's in the room), this guest's permissions, the lobby info, and the
// live playback state if a session is running.
export interface WTStateSync extends WTBase {
  type: "state-sync";
  to: string;
  participants: WTParticipant[];
  permissions: GuestPermissions;
  info: WTSessionInfo | null;
  session: WTSessionState | null;
}

export type WTNoticeAction = "pause" | "resume" | "seek" | "audio" | "subtitle";

// Human-facing "who did what" event, emitted by the host on real player actions and shown to guests as a
// transient toast. Separate from sync-watch (which carries state the guest silently applies) so guests don't
// toast their own applied changes.
export interface WTNotice extends WTBase {
  type: "notice";
  action: WTNoticeAction;
  actorId?: string; // participant who did the action (host itself, or a guest via control)
  actorName?: string;
  detail?: string; // formatted time for seek
}

export type WTMessage =
  | WTInviteGuest
  | WTStartWatch
  | WTSyncWatch
  | WTHostEnded
  | WTParticipantLeft
  | WTGuestReady
  | WTPermissions
  | WTControl
  | WTRename
  | WTChat
  | WTNotice
  | WTRoomInfo
  | WTStateSync
  | WTPing
  | WTPong
  | WTPingReport
  | WTNoHost;

export interface WTParticipant {
  id: string;
  role: WTRole;
  name?: string;
}

export type WTConnectionState = "idle" | "connecting" | "connected" | "reconnecting";

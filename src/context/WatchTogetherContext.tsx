import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayback } from "./PlaybackContext";
import { useAuth } from "./AuthContext";
import { logger } from "../utils/logger";
import { SettingsService } from "../utils/SettingsService";
import { WatchTogetherClient } from "../network/WatchTogetherClient";
import {
  buildShareToken,
  generateRoomKey,
  parseShareToken,
} from "../network/roomToken";
import type {
  ChatMessage,
  GuestPermissions,
  WTConnectionState,
  WTControl,
  WTMessage,
  WTNotice,
  WTNoticeAction,
  WTParticipant,
  WTPong,
  WTRole,
  WTSessionInfo,
  WTSyncWatch,
} from "../network/watchTogetherTypes";
import type { WTSessionState } from "../network/watchTogetherTypes";
import { NO_PERMISSIONS } from "../network/watchTogetherTypes";
import type { ActivePlayback } from "./playbackTypes";
import { WatchTogetherContext, type WatchTogetherContextType } from "./watchTogetherState";

const START_HANDSHAKE_TIMEOUT_MS = 12000; // fallback: start even if a guest never reports ready
const JOIN_TIMEOUT_MS = 8000; // guest: no state-sync AND no no-host reply within this → treat the room as dead

// Distil a playback descriptor into the lobby session info (banner + title + lightweight playlist).
function descriptorToSessionInfo(d: ActivePlayback): WTSessionInfo {
  return {
    title: d.title,
    backdropSrc: d.backdropSrc,
    posterSrc: d.posterSrc,
    mediaType: d.mediaType,
    playlist: d.playlist?.map((p) => ({ season: p.season, episode: p.episode, title: p.title })),
    playlistIndex: d.playlistIndex,
  };
}

function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("potok_client_id");
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
    sessionStorage.setItem("potok_client_id", id);
  }
  return id;
}

export const WatchTogetherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { playVideo, stopVideo } = usePlayback();
  const { potokUser } = useAuth();
  const navigate = useNavigate();
  const clientId = useMemo(() => getClientId(), []);
  const [myName, setMyNameState] = useState<string>(potokUser?.username ?? "");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<WTRole | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [participants, setParticipants] = useState<WTParticipant[]>([]);
  const [pendingDescriptor, setPendingDescriptor] = useState<ActivePlayback | null>(null);
  const [connectionState, setConnectionState] = useState<WTConnectionState>("idle");
  const [hostEnded, setHostEnded] = useState(false);
  const [hostPaused, setHostPaused] = useState(false);
  const [hostPausedBy, setHostPausedBy] = useState<string | null>(null);
  const [hostStarted, setHostStarted] = useState(false); // guest: host has begun playing at least once
  const [guestPermissions, setGuestPermissionsState] = useState<GuestPermissions>(NO_PERMISSIONS); // host config
  const [myPermissions, setMyPermissions] = useState<GuestPermissions>(NO_PERMISSIONS); // guest: granted
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const chatIdRef = useRef(0);
  const [roomInfo, setRoomInfo] = useState<WTSessionInfo | null>(null); // guest: session info pushed by the host
  const [pings, setPings] = useState<Record<string, number>>({}); // participant id → RTT-to-host (ms)
  const [roomUnavailable, setRoomUnavailable] = useState(false); // guest joined a room with no live host
  // Coordinated-start gate: false while the host waits for guests' ready-handshake, true once all are ready
  // (or a timeout). The host's player holds playback until this opens.
  const [startGateOpen, setStartGateOpen] = useState(true);

  const clientRef = useRef<WatchTogetherClient | null>(null);
  const roleRef = useRef<WTRole | null>(null);
  const roomKeyRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const descriptorRef = useRef<ActivePlayback | null>(null);
  const sessionActiveRef = useRef(false);
  const syncHandlersRef = useRef(new Set<(m: WTSyncWatch) => void>());
  // Last sync-watch a guest received, replayed to a handler on (re)subscribe. The host now emits sync only on
  // real actions, so a guest whose player mounts AFTER the bootstrap sync would otherwise miss it.
  const lastSyncRef = useRef<WTSyncWatch | null>(null);
  const noticeHandlersRef = useRef(new Set<(n: WTNotice) => void>());
  const controlHandlersRef = useRef(new Set<(c: WTControl) => void>());
  const pongHandlersRef = useRef(new Set<(p: WTPong) => void>());
  const guestPermissionsRef = useRef<GuestPermissions>(guestPermissions);
  guestPermissionsRef.current = guestPermissions;
  const myNameRef = useRef<string>(myName);
  myNameRef.current = myName;

  // Ready-handshake bookkeeping (host side).
  const expectedGuestsRef = useRef(new Set<string>());
  const readyGuestsRef = useRef(new Set<string>());
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const participantsRef = useRef<WTParticipant[]>(participants);
  participantsRef.current = participants;
  // Host: coordinated-start round. Bumped every time the gate is (re)armed — start, episode switch, or seek — so
  // guests know to re-run the ready-handshake and the host ignores a ready reported for a stale round.
  const roundRef = useRef(0);
  // Host: the live playback snapshot (kept fresh by emitSync). The single source of truth pushed to a new joiner
  // so it opens the player at the right spot and, if paused, shows the pause overlay immediately.
  const hostSnapshotRef = useRef<{ time: number; paused: boolean; pausedBy?: string; started: boolean }>({
    time: 0,
    paused: true,
    started: false,
  });
  // Host: streamUrl of the descriptor last broadcast via start-watch. Guards hostAnnounceEpisode so the initial
  // episode (already broadcast by startWatch) isn't re-announced when the host player mounts.
  const lastBroadcastUrlRef = useRef<string | null>(null);
  // Guest: fires if the host neither replies (state-sync) nor the server rejects (no-host) — treat as dead room.
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Host: open the start gate once every expected guest has reported ready (or when there are none).
  const checkStartGate = useCallback(() => {
    for (const id of expectedGuestsRef.current) {
      if (!readyGuestsRef.current.has(id)) return;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    setStartGateOpen(true);
  }, []);

  // Host: (re)arm the coordinated-start handshake — hold playback until every present guest reports ready (or a
  // timeout). Used both for the initial Start and for every episode switch, so each new episode starts in sync.
  const armStartGate = useCallback(() => {
    roundRef.current += 1;
    expectedGuestsRef.current = new Set(
      participantsRef.current.filter((p) => p.role === "guest").map((p) => p.id),
    );
    readyGuestsRef.current = new Set();
    setStartGateOpen(false);
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = setTimeout(() => setStartGateOpen(true), START_HANDSHAKE_TIMEOUT_MS);
  }, []);

  // Tear down all local co-watch state (refs + reactive state). Does NOT broadcast, disconnect, navigate, or
  // touch `hostEnded` — callers do those. Used by leave() and by the host-ended teardown.
  const resetLocalState = useCallback(() => {
    clientRef.current = null;
    roomKeyRef.current = null;
    tokenRef.current = null;
    roleRef.current = null;
    descriptorRef.current = null;
    sessionActiveRef.current = false;
    lastSyncRef.current = null;
    expectedGuestsRef.current = new Set();
    readyGuestsRef.current = new Set();
    roundRef.current = 0;
    hostSnapshotRef.current = { time: 0, paused: true, started: false };
    lastBroadcastUrlRef.current = null;
    if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
    startTimeoutRef.current = null;
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
    guestPermissionsRef.current = NO_PERMISSIONS;
    setRoomId(null);
    setRoomInfo(null);
    setPings({});
    setRole(null);
    setSessionActive(false);
    setParticipants([]);
    setPendingDescriptor(null);
    setHostPaused(false);
    setHostPausedBy(null);
    setHostStarted(false);
    setStartGateOpen(true);
    setGuestPermissionsState(NO_PERMISSIONS);
    setMyPermissions(NO_PERMISSIONS);
    setChatMessages([]);
    setChatOpen(false);
    setConnectionState("idle");
  }, []);

  const dismissHostEnded = useCallback(() => setHostEnded(false), []);

  // Any participant: send a chat message. The sender doesn't get its own broadcast (OthersInGroup), so echo it
  // locally as `mine`.
  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const key = roomKeyRef.current;
      if (!trimmed || !key) return;
      setChatMessages((prev) => [
        ...prev,
        { id: chatIdRef.current++, senderId: clientId, name: myNameRef.current, text: trimmed, mine: true },
      ]);
      clientRef.current?.broadcast(key, {
        type: "chat",
        senderId: clientId,
        role: roleRef.current ?? "guest",
        text: trimmed,
        name: myNameRef.current,
      });
    },
    [clientId],
  );

  // Broadcast start-watch to the room (used on Start and to catch up late-joining guests).
  const broadcastStart = useCallback(() => {
    const key = roomKeyRef.current;
    const descriptor = descriptorRef.current;
    if (!key || !descriptor) return;
    clientRef.current?.broadcast(key, {
      type: "start-watch",
      senderId: clientId,
      role: "host",
      time: 0,
      streamUrl: descriptor.streamUrl,
      descriptor: { ...descriptor, startAtZero: true, coWatch: true }, // co-watch always begins at 00:00
    });
  }, [clientId]);

  // Host → room: push what's being watched so the lobby can show a banner + playlist (called on guest join).
  const broadcastRoomInfo = useCallback(() => {
    const key = roomKeyRef.current;
    const descriptor = descriptorRef.current;
    if (roleRef.current !== "host" || !key || !descriptor) return;
    clientRef.current?.broadcast(key, {
      type: "room-info",
      senderId: clientId,
      role: "host",
      ...descriptorToSessionInfo(descriptor),
    });
  }, [clientId]);

  // Host → ONE new joiner: the authoritative snapshot (roster + this guest's permissions + lobby info + live
  // playback state). Targeted via `to`, so existing participants aren't disturbed. This is how a late joiner
  // catches up — replacing the old broadcast-to-everyone start-watch that yanked existing guests back to 0.
  const sendStateSync = useCallback(
    (targetId: string, roster: WTParticipant[]) => {
      const key = roomKeyRef.current;
      const descriptor = descriptorRef.current;
      if (roleRef.current !== "host" || !key) return;
      const snap = hostSnapshotRef.current;
      const session: WTSessionState | null =
        sessionActiveRef.current && descriptor
          ? {
              descriptor: { ...descriptor, startAtZero: true, coWatch: true },
              round: roundRef.current,
              time: snap.time,
              paused: snap.paused,
              pausedBy: snap.paused ? snap.pausedBy : undefined,
              hostStarted: snap.started,
            }
          : null;
      clientRef.current?.broadcast(key, {
        type: "state-sync",
        senderId: clientId,
        role: "host",
        to: targetId,
        participants: roster,
        permissions: guestPermissionsRef.current,
        info: descriptor ? descriptorToSessionInfo(descriptor) : null,
        session,
      });
    },
    [clientId],
  );

  const upsertParticipant = useCallback((p: WTParticipant) => {
    setParticipants((prev) => {
      const rest = prev.filter((x) => x.id !== p.id);
      return [...rest, p];
    });
  }, []);

  const handleMessage = useCallback(
    (msg: WTMessage) => {
      switch (msg.type) {
        case "invite-guest":
          upsertParticipant({ id: msg.id, role: msg.role, name: msg.name });
          // Host is the single source of truth: answer a guest's announcement with a targeted snapshot (full
          // roster + permissions + lobby info + live playback state) — only that guest, so existing participants
          // aren't disrupted. Existing guests learn about the newcomer from its own invite-guest broadcast above.
          if (roleRef.current === "host" && msg.role === "guest" && roomKeyRef.current) {
            const roster: WTParticipant[] = [
              ...participantsRef.current.filter((p) => p.id !== msg.id),
              { id: msg.id, role: msg.role, name: msg.name },
            ];
            sendStateSync(msg.id, roster);
          }
          break;
        case "state-sync":
          // A late joiner receives the host's authoritative snapshot.
          if (roleRef.current === "guest" && msg.to === clientId) {
            // Host replied → the room is alive; cancel the dead-room timeout.
            if (joinTimeoutRef.current) { clearTimeout(joinTimeoutRef.current); joinTimeoutRef.current = null; }
            setParticipants(msg.participants);
            setMyPermissions(msg.permissions);
            setRoomInfo(msg.info);
            if (msg.session) {
              const s = msg.session;
              descriptorRef.current = s.descriptor;
              sessionActiveRef.current = true;
              // Seed the last sync so the just-mounting player aligns to the host's position and reports ready for
              // the current round. No hostTs → no extrapolation on this (≤1 s stale) snapshot; live sync refines.
              lastSyncRef.current = {
                type: "sync-watch",
                senderId: msg.senderId,
                role: "host",
                time: s.time,
                paused: s.paused,
                pausedBy: s.pausedBy,
                round: s.round,
              };
              setHostPaused(s.paused);
              setHostPausedBy(s.paused ? s.pausedBy ?? null : null);
              setHostStarted(s.hostStarted); // so the pause overlay shows immediately if joined during a pause
              setPendingDescriptor(s.descriptor);
              setSessionActive(true);
              playVideo(s.descriptor);
            }
          }
          break;
        case "permissions":
          setMyPermissions(msg.permissions);
          break;
        case "rename":
          setParticipants((prev) => prev.map((p) => (p.id === msg.id ? { ...p, name: msg.name } : p)));
          break;
        case "chat":
          setChatMessages((prev) => [
            ...prev,
            { id: chatIdRef.current++, senderId: msg.senderId, name: msg.name || "", text: msg.text, mine: false },
          ]);
          break;
        case "control":
          // Host authority: apply a guest's control only if the guest is actually allowed that action.
          if (roleRef.current === "host") {
            if (guestPermissionsRef.current.canControl) controlHandlersRef.current.forEach((h) => h(msg));
          }
          break;
        case "room-info":
          if (roleRef.current === "guest") {
            setRoomInfo({
              title: msg.title,
              backdropSrc: msg.backdropSrc,
              posterSrc: msg.posterSrc,
              mediaType: msg.mediaType,
              playlist: msg.playlist,
              playlistIndex: msg.playlistIndex,
            });
          }
          break;
        case "start-watch":
          descriptorRef.current = msg.descriptor;
          sessionActiveRef.current = true;
          lastSyncRef.current = null; // fresh session — don't replay a previous session's state
          setHostPaused(false);
          setHostPausedBy(null);
          setHostStarted(false);
          setPendingDescriptor(msg.descriptor);
          setSessionActive(true);
          playVideo(msg.descriptor);
          break;
        case "sync-watch":
          lastSyncRef.current = msg;
          setHostPaused(msg.paused);
          setHostPausedBy(msg.paused ? msg.pausedBy ?? null : null);
          if (!msg.paused) setHostStarted(true); // first un-paused sync = the session has really begun
          syncHandlersRef.current.forEach((h) => h(msg));
          break;
        case "notice":
          noticeHandlersRef.current.forEach((h) => h(msg));
          break;
        case "host-ended":
          // Host closed the room → close the player, send the guest home, tear everything down, then raise the
          // "host closed the room" modal.
          stopVideo();
          navigate("/");
          clientRef.current?.disconnect();
          resetLocalState();
          setHostEnded(true);
          break;
        case "no-host":
          // Server rejected our join: this room has no live host (stale link). Tear down and show the terminal
          // "room unavailable" state on the lobby (no navigation — the guest is already on the lobby page).
          if (joinTimeoutRef.current) { clearTimeout(joinTimeoutRef.current); joinTimeoutRef.current = null; }
          clientRef.current?.disconnect();
          resetLocalState();
          setRoomUnavailable(true);
          break;
        case "ping":
          // Host answers a guest's clock-sync probe. t2 = receive, t3 = send (host clock); near-instant in JS,
          // but both are kept so the guest can subtract host processing time from the round-trip.
          if (roleRef.current === "host" && roomKeyRef.current) {
            const t2 = Date.now();
            clientRef.current?.broadcast(roomKeyRef.current, {
              type: "pong",
              senderId: clientId,
              role: "host",
              id: msg.senderId,
              t1: msg.t1,
              t2,
              t3: Date.now(),
            });
          }
          break;
        case "pong":
          if (msg.id === clientId) pongHandlersRef.current.forEach((h) => h(msg));
          break;
        case "ping-report":
          setPings((prev) => ({ ...prev, [msg.senderId]: msg.rttMs }));
          break;
        case "guest-ready":
          // Ignore a ready reported for a superseded round (e.g. a guest still buffering an old seek).
          if (msg.round === undefined || msg.round === roundRef.current) {
            readyGuestsRef.current.add(msg.id);
            checkStartGate();
          }
          break;
        case "participant-left":
          setParticipants((prev) => prev.filter((x) => x.id !== msg.id));
          setPings((prev) => {
            const { [msg.id]: _gone, ...rest } = prev;
            return rest;
          });
          // A guest we were waiting on left — stop waiting on it.
          expectedGuestsRef.current.delete(msg.id);
          readyGuestsRef.current.delete(msg.id);
          checkStartGate();
          break;
      }
    },
    [clientId, playVideo, upsertParticipant, sendStateSync, checkStartGate, stopVideo, navigate, resetLocalState],
  );

  const ensureClient = useCallback((): WatchTogetherClient => {
    if (!clientRef.current) {
      const client = new WatchTogetherClient();
      client.onMessage(handleMessage);
      client.onStateChange(setConnectionState);
      clientRef.current = client;
    }
    return clientRef.current;
  }, [handleMessage]);

  const createRoom = useCallback(
    (descriptor: ActivePlayback) => {
      // Tear down any prior room so a re-created room can't inherit stale session state (e.g. a lingering
      // sessionActiveRef would auto-start a joining guest).
      clientRef.current?.disconnect();
      clientRef.current = null;
      sessionActiveRef.current = false;
      lastSyncRef.current = null;
      expectedGuestsRef.current = new Set();
      readyGuestsRef.current = new Set();
      roundRef.current = 0;
      hostSnapshotRef.current = { time: 0, paused: true, started: false };
      lastBroadcastUrlRef.current = null;
      if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
      setStartGateOpen(true);
      guestPermissionsRef.current = NO_PERMISSIONS;
      setGuestPermissionsState(NO_PERMISSIONS); // new room → guests can do nothing by default

      const key = generateRoomKey();
      const gatewayUrl = SettingsService.getGatewayUrl();
      roomKeyRef.current = key;
      tokenRef.current = buildShareToken(key, gatewayUrl);
      roleRef.current = "host";
      descriptorRef.current = descriptor;

      setRoomId(key);
      setRole("host");
      setPendingDescriptor(descriptor);
      setParticipants([{ id: clientId, role: "host", name: myNameRef.current }]);
      setSessionActive(false);
      setHostEnded(false);

      const client = ensureClient();
      client
        .connect(gatewayUrl)
        .then(() => client.joinRoom(key, clientId, "host"))
        .catch((err) => logger.error("[WT] createRoom failed:", err));
    },
    [clientId, ensureClient],
  );

  const joinAsGuest = useCallback(
    (token: string) => {
      if (roomKeyRef.current) return; // already in a room
      const parsed = parseShareToken(token);
      if (!parsed) {
        logger.error("[WT] Invalid share token.");
        return;
      }
      const { roomKey, gatewayUrl } = parsed;
      roomKeyRef.current = roomKey;
      tokenRef.current = token; // keep the invite token so a guest can copy/share the link from the Info panel
      roleRef.current = "guest";
      sessionActiveRef.current = false;
      lastSyncRef.current = null;
      setMyPermissions(NO_PERMISSIONS); // until the host grants anything
      setRoomUnavailable(false); // fresh attempt

      setRoomId(roomKey);
      setRole("guest");
      setParticipants([{ id: clientId, role: "guest", name: myNameRef.current }]);

      const client = ensureClient();
      client
        .connect(gatewayUrl)
        .then(() => client.joinRoom(roomKey, clientId, "guest"))
        .then(() =>
          client.broadcast(roomKey, {
            type: "invite-guest",
            senderId: clientId,
            role: "guest",
            id: clientId,
            name: myNameRef.current,
          }),
        )
        .catch((err) => logger.error("[WT] joinAsGuest failed:", err));

      // Backstop: the server sends `no-host` for a dead room (cleared on that), and the host replies `state-sync`
      // for a live one (cleared on that). If NEITHER arrives, the room is unreachable — show the terminal state.
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = setTimeout(() => {
        joinTimeoutRef.current = null;
        clientRef.current?.disconnect();
        resetLocalState();
        setRoomUnavailable(true);
      }, JOIN_TIMEOUT_MS);
    },
    [clientId, ensureClient, resetLocalState],
  );

  const dismissRoomUnavailable = useCallback(() => setRoomUnavailable(false), []);

  const startWatch = useCallback(() => {
    const descriptor = descriptorRef.current;
    if (roleRef.current !== "host" || !roomKeyRef.current || !descriptor) return;
    sessionActiveRef.current = true;
    lastBroadcastUrlRef.current = descriptor.streamUrl; // this episode is broadcast here; don't re-announce on mount

    armStartGate(); // wait for every present guest's ready-handshake before releasing playback
    broadcastStart();
    setSessionActive(true);
    playVideo({ ...descriptor, startAtZero: true, coWatch: true }); // host also begins at 00:00
    checkStartGate(); // open immediately if there are no guests to wait for
  }, [armStartGate, broadcastStart, playVideo, checkStartGate]);

  // Host: the playlist episode changed (host used the menu, or a permitted guest requested it via control). The
  // host's player has already switched to the new descriptor; re-broadcast it and re-run the ready-handshake so
  // every guest switches to the same episode and everyone restarts in sync. Guarded so the initial episode
  // (already broadcast by startWatch) isn't re-announced when the host player first mounts.
  const hostAnnounceEpisode = useCallback(
    (descriptor: ActivePlayback) => {
      if (roleRef.current !== "host" || !sessionActiveRef.current || !roomKeyRef.current) return;
      if (descriptor.streamUrl === lastBroadcastUrlRef.current) return;
      lastBroadcastUrlRef.current = descriptor.streamUrl;
      descriptorRef.current = descriptor;
      setPendingDescriptor(descriptor);
      armStartGate();
      broadcastStart();
      broadcastRoomInfo(); // refresh the lobby's current-episode highlight
      checkStartGate();
    },
    [armStartGate, broadcastStart, broadcastRoomInfo, checkStartGate],
  );

  // Host: someone seeked (the host, or a permitted guest whose seek the host applied). Re-arm the ready-gate so
  // the host holds at the new position until every guest reports ready again — otherwise the host plays on while
  // guests are still re-buffering the seek target. No re-broadcast/replay: the running sync already carries the
  // new time + bumped round, which is how guests learn to re-align and re-ready.
  const hostAwaitResync = useCallback(() => {
    if (roleRef.current !== "host" || !sessionActiveRef.current || !roomKeyRef.current) return;
    armStartGate();
    checkStartGate(); // open immediately if there are no guests to wait for
  }, [armStartGate, checkStartGate]);

  // Guest → host: announce we've buffered at the current sync position and are ready to play. Sent once per
  // round (the bridge dedupes) — a round bumps on start, episode switch, and every seek. Carries the round so a
  // late-arriving ready for a superseded round is ignored by the host.
  const sendGuestReady = useCallback(
    (round: number) => {
      const key = roomKeyRef.current;
      if (roleRef.current !== "guest" || !key) return;
      clientRef.current?.broadcast(key, { type: "guest-ready", senderId: clientId, role: "guest", id: clientId, round });
    },
    [clientId],
  );

  // Guest → host: clock-sync probe (t1 = our send time). The host echoes it back as a pong for offset/RTT math.
  const sendPing = useCallback(() => {
    const key = roomKeyRef.current;
    if (roleRef.current !== "guest" || !key) return;
    clientRef.current?.broadcast(key, { type: "ping", senderId: clientId, role: "guest", t1: Date.now() });
  }, [clientId]);

  const onPong = useCallback((cb: (p: WTPong) => void) => {
    pongHandlersRef.current.add(cb);
    return () => {
      pongHandlersRef.current.delete(cb);
    };
  }, []);

  // Guest → room: publish the measured RTT so everyone's Info panel can show this guest's ping. Reflect locally
  // too (OthersInGroup won't echo our own broadcast back).
  const reportPing = useCallback(
    (rttMs: number) => {
      const key = roomKeyRef.current;
      if (roleRef.current !== "guest" || !key) return;
      setPings((prev) => ({ ...prev, [clientId]: rttMs }));
      clientRef.current?.broadcast(key, { type: "ping-report", senderId: clientId, role: "guest", rttMs });
    },
    [clientId],
  );

  const emitSync = useCallback(
    (sync: Omit<WTSyncWatch, "type" | "senderId" | "role">) => {
      const key = roomKeyRef.current;
      if (roleRef.current !== "host" || !key) return;
      // Reflect locally too — the host never receives its own broadcast, but its own overlays (e.g. the pause
      // modal when a GUEST paused) need the current pause state + actor.
      setHostPaused(sync.paused);
      setHostPausedBy(sync.paused ? sync.pausedBy ?? null : null);
      if (!sync.paused) setHostStarted(true);
      // Keep the authoritative snapshot current so a late joiner gets the exact position + pause state.
      hostSnapshotRef.current = {
        time: sync.time,
        paused: sync.paused,
        pausedBy: sync.paused ? sync.pausedBy : undefined,
        started: hostSnapshotRef.current.started || !sync.paused,
      };
      clientRef.current?.broadcast(key, {
        ...sync,
        type: "sync-watch",
        senderId: clientId,
        role: "host",
        round: roundRef.current,
        hostTs: Date.now(), // stamp the emit so guests can extrapolate the playhead forward by the transit delay
      });
    },
    [clientId],
  );

  const onSyncMessage = useCallback((cb: (m: WTSyncWatch) => void) => {
    syncHandlersRef.current.add(cb);
    // Replay the latest known host state so a just-mounted guest player aligns immediately.
    if (lastSyncRef.current) cb(lastSyncRef.current);
    return () => {
      syncHandlersRef.current.delete(cb);
    };
  }, []);

  const emitNotice = useCallback(
    (action: WTNoticeAction, detail?: string, actorId?: string) => {
      const key = roomKeyRef.current;
      if (roleRef.current !== "host" || !key) return;
      const id = actorId ?? clientId; // default actor is the host itself
      const actorName =
        id === clientId ? myNameRef.current : participantsRef.current.find((p) => p.id === id)?.name;
      const notice: WTNotice = {
        type: "notice",
        senderId: clientId,
        role: "host",
        action,
        actorId: id,
        actorName,
        detail,
      };
      clientRef.current?.broadcast(key, notice);
      // Reflect locally so the host also sees notices for actions a GUEST initiated (its own broadcast never
      // comes back). The toast component filters out notices whose actor is the viewer.
      noticeHandlersRef.current.forEach((h) => h(notice));
    },
    [clientId],
  );

  const onNotice = useCallback((cb: (n: WTNotice) => void) => {
    noticeHandlersRef.current.add(cb);
    return () => {
      noticeHandlersRef.current.delete(cb);
    };
  }, []);

  // Host: change guest permissions and push them to the room (existing guests update live).
  const setGuestPermissions = useCallback(
    (perms: GuestPermissions) => {
      guestPermissionsRef.current = perms;
      setGuestPermissionsState(perms);
      const key = roomKeyRef.current;
      if (roleRef.current === "host" && key) {
        clientRef.current?.broadcast(key, { type: "permissions", senderId: clientId, role: "host", permissions: perms });
      }
    },
    [clientId],
  );

  // Guest: request a control action (the host validates + applies).
  const sendControl = useCallback(
    (action: WTControl["action"], time?: number, index?: number) => {
      const key = roomKeyRef.current;
      if (roleRef.current !== "guest" || !key) return;
      clientRef.current?.broadcast(key, { type: "control", senderId: clientId, role: "guest", action, time, index });
    },
    [clientId],
  );

  // Host: receive validated control requests.
  const onControl = useCallback((cb: (c: WTControl) => void) => {
    controlHandlersRef.current.add(cb);
    return () => {
      controlHandlersRef.current.delete(cb);
    };
  }, []);

  // Any participant: set/change display name and push it to the room.
  const setMyName = useCallback(
    (name: string) => {
      setMyNameState(name);
      myNameRef.current = name;
      setParticipants((prev) => prev.map((p) => (p.id === clientId ? { ...p, name } : p)));
      const key = roomKeyRef.current;
      if (key) {
        clientRef.current?.broadcast(key, {
          type: "rename",
          senderId: clientId,
          role: roleRef.current ?? "guest",
          id: clientId,
          name,
        });
      }
    },
    [clientId],
  );

  const leave = useCallback(() => {
    const key = roomKeyRef.current;
    const client = clientRef.current;
    if (key && client) {
      // Flush the leave notice BEFORE tearing down, else OthersInGroup never receives it and the leaver
      // lingers in everyone's participant list (there's no server-side presence in iteration 1).
      client
        .broadcast(key, {
          type: roleRef.current === "host" ? "host-ended" : "participant-left",
          senderId: clientId,
          role: roleRef.current ?? "guest",
          ...(roleRef.current === "host" ? {} : { id: clientId }),
        } as WTMessage)
        .then(() => client.leaveRoom(key))
        .finally(() => client.disconnect());
    }
    setHostEnded(false); // an explicit self-leave is not a "host closed the room" event
    resetLocalState();
  }, [clientId, resetLocalState]);

  const getShareLink = useCallback(() => {
    if (!tokenRef.current || typeof window === "undefined") return "";
    return `${window.location.origin}/watch-together?room=${encodeURIComponent(tokenRef.current)}`;
  }, []);

  // While the host sits in the lobby (room created, not yet started) the player is closed, so its keepalive
  // isn't running. Keep pinging the backend session ourselves so the torrent/stream isn't reaped before the
  // host presses Start. Once the session starts (player opens) usePlayerBackendSession takes over.
  useEffect(() => {
    const session = pendingDescriptor?.session;
    const keepaliveUrl = session?.keepaliveUrl;
    if (role !== "host" || sessionActive || !keepaliveUrl) return;
    const ping = () => {
      fetch(keepaliveUrl, {
        method: "POST",
        body: JSON.stringify({
          sessionId: clientId,
          hash: (session?.hash || pendingDescriptor?.streamHash || "").toLowerCase(),
          file: session?.file ?? pendingDescriptor?.fileIndex,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, (session?.intervalSec || 7) * 1000);
    return () => clearInterval(id);
  }, [role, sessionActive, pendingDescriptor, clientId]);

  // The host derives session info from its own pending descriptor; a guest uses what the host pushed (room-info).
  const sessionInfo = useMemo<WTSessionInfo | null>(
    () => (role === "host" ? (pendingDescriptor ? descriptorToSessionInfo(pendingDescriptor) : null) : roomInfo),
    [role, pendingDescriptor, roomInfo],
  );

  const value = useMemo<WatchTogetherContextType>(
    () => ({
      roomId,
      role,
      sessionActive,
      participants,
      pendingDescriptor,
      connectionState,
      hostEnded,
      hostPaused,
      hostPausedBy,
      hostStarted,
      myName,
      startGateOpen,
      guestPermissions,
      myPermissions,
      chatMessages,
      chatOpen,
      clientId,
      sessionInfo,
      pings,
      roomUnavailable,
      createRoom,
      joinAsGuest,
      startWatch,
      hostAnnounceEpisode,
      hostAwaitResync,
      leave,
      onSyncMessage,
      emitSync,
      emitNotice,
      onNotice,
      sendGuestReady,
      sendPing,
      onPong,
      reportPing,
      setGuestPermissions,
      sendControl,
      onControl,
      setMyName,
      dismissHostEnded,
      dismissRoomUnavailable,
      sendChat,
      setChatOpen,
      getShareLink,
    }),
    [
      roomId,
      role,
      sessionActive,
      participants,
      pendingDescriptor,
      connectionState,
      hostEnded,
      hostPaused,
      hostPausedBy,
      hostStarted,
      myName,
      startGateOpen,
      guestPermissions,
      myPermissions,
      chatMessages,
      chatOpen,
      clientId,
      sessionInfo,
      pings,
      roomUnavailable,
      createRoom,
      joinAsGuest,
      startWatch,
      hostAnnounceEpisode,
      hostAwaitResync,
      leave,
      onSyncMessage,
      emitSync,
      emitNotice,
      onNotice,
      sendGuestReady,
      sendPing,
      onPong,
      reportPing,
      setGuestPermissions,
      sendControl,
      onControl,
      setMyName,
      dismissHostEnded,
      dismissRoomUnavailable,
      sendChat,
      setChatOpen,
      getShareLink,
    ],
  );

  return <WatchTogetherContext.Provider value={value}>{children}</WatchTogetherContext.Provider>;
};

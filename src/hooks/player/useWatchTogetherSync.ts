import { useEffect, useRef } from "react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { useClockSync } from "./useClockSync";
import type { useWebMediaPlayer } from "../useWebMediaPlayer";
import type { WTSyncWatch } from "../../network/watchTogetherTypes";

type PlayerVM = ReturnType<typeof useWebMediaPlayer>;

const SYNC_INTERVAL_MS = 1000;
const HARD_SEEK_SEC = 0.75; // error above this → hard seek (a real jump); below → smooth playbackRate nudge
const ALIGN_SEC = 0.2; // on a fresh coordinated round, hard-seek to align if off by more than this
const NUDGE_DEADBAND_SEC = 0.05; // within this, we're in sync — run at 1.0x
const MAX_RATE_DELTA = 0.1; // cap the speed nudge at ±10% so it stays imperceptible
const RATE_GAIN = 0.5; // rate delta per second of error
const MAX_EXTRAP_SEC = 2.0; // clamp the forward extrapolation so a stale/glitched timestamp can't fling us
const SEEK_SUPPRESS_MS = 1500;
const NOTICE_PRIME_MS = 2000; // ignore startup seek events for this long after session start
const READY_STATE_CAN_PLAY = 3; // HTMLMediaElement.HAVE_FUTURE_DATA — first bytes buffered, can start

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// The host's true current playhead in the guest's clock: the sampled position, extrapolated forward by the
// time elapsed since the host stamped it (transit + queuing), using the estimated clock offset. Only extrapolate
// while the host is playing — a paused playhead doesn't advance.
function hostTargetTime(msg: WTSyncWatch, clockOffsetMs: number | null): number {
  // No compensation while paused, or before we have a clock estimate (extrapolating on a guessed offset could
  // fling the guest — device wall-clocks can differ by seconds).
  if (msg.paused || msg.hostTs === undefined || clockOffsetMs === null) return msg.time;
  const ageSec = clamp((Date.now() + clockOffsetMs - msg.hostTs) / 1000, 0, MAX_EXTRAP_SEC);
  return msg.time + ageSec;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

// Bridges the player view-model to the co-watch transport. Mounted once inside WebMediaPlayer, where the
// imperative API (videoRef, seekOffset, handleSeek, current time) is local. Host: broadcasts sync-watch
// (time + pause) every second + a "seek" toast on real seeks. Guest: applies timeline + pause only — audio
// and subtitles are each guest's own choice, never synced. Guests never broadcast, so no feedback loop.
export function useWatchTogetherSync(vm: PlayerVM): void {
  const { role, sessionActive, startGateOpen, clientId, emitSync, emitNotice, onSyncMessage, sendGuestReady, sendPing, onPong, reportPing, onControl, hostAnnounceEpisode, hostAwaitResync } =
    useWatchTogether();
  const vmRef = useRef(vm);
  vmRef.current = vm;

  // Guest: keep a running estimate of the host↔guest clock offset so we can extrapolate out the WAN delay, and
  // publish the measured RTT to the room for the Info panel's ping display.
  const clockOffsetRef = useClockSync(role === "guest" && sessionActive, sendPing, onPong, reportPing);

  // Host: who caused the current pause. Defaults to the host itself; a guest's control(pause) sets it to that
  // guest, so the guest pause overlay attributes the pause correctly. Reset to the host on any play.
  const pauseActorIdRef = useRef(clientId);
  // Host: who caused the next seek (host by default; a guest's control(seek) sets it for that one seek).
  const seekActorIdRef = useRef(clientId);

  // Logical time = seekOffset + video.currentTime (symmetric with useDebouncedSeek's offset handling).
  const logicalTime = (): number => {
    const v = vmRef.current.videoRef.current;
    return v ? vmRef.current.seekOffset + v.currentTime : 0;
  };

  // Host: broadcast position + pause once per second (drift correction / late-joiner alignment). Audio/subs
  // are NOT synced — each guest picks their own.
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    const id = setInterval(() => {
      const v = vmRef.current.videoRef.current;
      if (!v) return;
      emitSync({
        time: vmRef.current.seekOffset + v.currentTime,
        paused: v.paused,
        pausedBy: v.paused ? pauseActorIdRef.current : undefined,
      });
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [role, sessionActive, emitSync]);

  // Host: emit IMMEDIATELY on play/pause (and once when the start gate opens) so start/pause/resume reach
  // guests within a single network hop instead of waiting up to a full 1 Hz tick (the ~500 ms desync).
  useEffect(() => {
    if (role !== "host" || !sessionActive || !startGateOpen) return;
    const v = vmRef.current.videoRef.current;
    if (!v) return;
    const emitNow = () =>
      emitSync({
        time: vmRef.current.seekOffset + v.currentTime,
        paused: v.paused,
        pausedBy: v.paused ? pauseActorIdRef.current : undefined,
      });
    const onPlay = () => { pauseActorIdRef.current = clientId; emitNow(); }; // resume clears the pause actor
    emitNow();
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", emitNow);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", emitNow);
    };
  }, [role, sessionActive, startGateOpen, emitSync, clientId]);

  // Host: hold playback until the start gate opens (every guest has reported ready via the handshake, or a
  // timeout), THEN start once our own buffer is ready — so everyone begins together. While holding, the video
  // buffers and the 1 Hz sync reports paused=true, so guests stay paused too.
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    const v = vmRef.current.videoRef.current;
    if (!v) return;

    if (!startGateOpen) {
      const keepPaused = () => v.pause();
      v.pause();
      v.addEventListener("play", keepPaused);
      return () => v.removeEventListener("play", keepPaused);
    }

    // Gate open — start as soon as the host's own buffer can play.
    if (v.readyState >= READY_STATE_CAN_PLAY) {
      v.play().catch(() => {});
      return;
    }
    const onReady = () => v.play().catch(() => {});
    v.addEventListener("canplay", onReady, { once: true });
    return () => v.removeEventListener("canplay", onReady);
  }, [role, sessionActive, startGateOpen]);

  // Host: emit a "seek" toast on real seeks. (Pause/resume is shown to guests as a dedicated overlay driven
  // by the sync-watch paused flag, so it doesn't need a transient toast.)
  const primedRef = useRef(false);
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    const v = vmRef.current.videoRef.current;
    if (!v) return;

    primedRef.current = false;
    const primeTimer = setTimeout(() => { primedRef.current = true; }, NOTICE_PRIME_MS);

    const onSeeked = () => {
      if (primedRef.current) {
        emitNotice("seek", formatTime(logicalTime()), seekActorIdRef.current);
        hostAwaitResync(); // hold at the new position until every guest has re-buffered and re-reported ready
      }
      seekActorIdRef.current = clientId; // consumed — next seek defaults back to the host
    };
    v.addEventListener("seeked", onSeeked);
    return () => {
      clearTimeout(primeTimer);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [role, sessionActive, emitNotice, hostAwaitResync, clientId]);

  // Host: apply validated control requests from guests. Applying to the host's own video makes the resulting
  // sync-watch propagate to everyone (host stays the single source of truth).
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    return onControl((c) => {
      // Episode switch doesn't touch the video element — it re-plays a new descriptor (handled below on mount).
      if (c.action === "episode" && typeof c.index === "number") { vmRef.current.playPlaylistItem(c.index); return; }
      const v = vmRef.current.videoRef.current;
      if (!v) return;
      if (c.action === "seek" && typeof c.time === "number") { seekActorIdRef.current = c.senderId; vmRef.current.handleSeek(c.time); } // attribute to the guest
      else if (c.action === "pause") { pauseActorIdRef.current = c.senderId; v.pause(); } // attribute to the guest
      else if (c.action === "play") { pauseActorIdRef.current = clientId; v.play().catch(() => {}); }
    });
  }, [role, sessionActive, onControl, clientId]);

  // Host: whenever the active episode changes (host used the playlist menu, or a permitted guest requested it),
  // the player remounts on the new descriptor — re-broadcast start-watch + re-run the ready-handshake so every
  // guest switches to the same episode and everyone restarts in sync. The initial episode is a no-op (guarded).
  useEffect(() => {
    if (role === "host" && sessionActive) hostAnnounceEpisode(vmRef.current.playback);
  }, [role, sessionActive, vm.playback.streamUrl, hostAnnounceEpisode]);

  // Guest: follow the host (timeline + pause only; tracks stay independent).
  const suppressUntilRef = useRef(0);
  const lastHostRef = useRef<WTSyncWatch | null>(null);
  const readiedRoundRef = useRef(-1); // highest coordinated round we've reported ready for
  useEffect(() => {
    if (role !== "guest") return;
    const v = vmRef.current.videoRef.current;

    const seekTo = (time: number) => {
      vmRef.current.handleSeek(time);
      suppressUntilRef.current = Date.now() + SEEK_SUPPRESS_MS;
    };

    // Force the guest to start playing immediately. Autoplay-with-sound may be blocked (no user gesture yet);
    // fall back to muted playback so it never stays stuck on pause — the guest can unmute from the controls.
    const forcePlay = () => {
      const vid = vmRef.current.videoRef.current;
      if (!vid || !vid.paused) return;
      vid.play().catch(() => {
        vid.muted = true;
        vid.play().catch(() => {});
      });
    };

    // Report ready for the host's current round once we've buffered at the synced position — the handshake that
    // releases start / a seek / an episode. Deduped per round. We keep buffering (and stay paused) until the
    // host actually releases (its sync flips to paused=false); only then do we play.
    const trySendReady = () => {
      const vid = vmRef.current.videoRef.current;
      const h = lastHostRef.current;
      if (!vid || !h) return;
      const round = h.round ?? 0;
      if (round <= readiedRoundRef.current) return; // already readied this round
      if (vid.readyState < READY_STATE_CAN_PLAY) return; // not buffered yet — wait for canplay/seeked
      readiedRoundRef.current = round;
      sendGuestReady(round);
      if (!h.paused) forcePlay(); // host isn't holding (e.g. a late joiner) → start now
    };

    // Temporarily speed up / slow down to converge on the host without a visible jump. Guarded so we don't churn
    // the property every tick.
    const setRate = (rate: number) => {
      const vid = vmRef.current.videoRef.current;
      if (vid && Math.abs(vid.playbackRate - rate) > 0.001) vid.playbackRate = rate;
    };

    // Snap to the host's latest (extrapolated) position whenever the guest actually starts playing.
    const onGuestPlay = () => {
      const h = lastHostRef.current;
      if (!h) return;
      const target = hostTargetTime(h, clockOffsetRef.current);
      if (Math.abs(logicalTime() - target) >= HARD_SEEK_SEC) seekTo(target);
    };
    v?.addEventListener("play", onGuestPlay);
    v?.addEventListener("canplay", trySendReady);
    v?.addEventListener("seeked", trySendReady);

    const unsub = onSyncMessage((msg) => {
      const vid = vmRef.current.videoRef.current;
      if (!vid) return;
      lastHostRef.current = msg;
      const round = msg.round ?? 0;
      const target = hostTargetTime(msg, clockOffsetRef.current); // WAN-compensated host position
      const err = target - logicalTime(); // +: guest is behind the host

      if (round > readiedRoundRef.current) {
        // New coordinated round (start / episode / seek): align to the host's position — even while paused, since
        // the host holds paused until we're ready — reset any nudge, then report ready once buffered.
        setRate(1);
        if (Math.abs(err) >= ALIGN_SEC) seekTo(target);
        trySendReady();
      } else if (vid.paused || Date.now() < suppressUntilRef.current) {
        // Paused (never chase a paused guest — the "keeps rewinding" bug) or settling after a seek: run at 1.0x.
        setRate(1);
      } else if (Math.abs(err) >= HARD_SEEK_SEC) {
        setRate(1);
        seekTo(target); // too far off to nudge smoothly — jump
      } else if (Math.abs(err) >= NUDGE_DEADBAND_SEC) {
        setRate(1 + clamp(err * RATE_GAIN, -MAX_RATE_DELTA, MAX_RATE_DELTA)); // ease toward the host
      } else {
        setRate(1); // in sync
      }

      if (msg.paused && !vid.paused) { setRate(1); vid.pause(); }
      else if (!msg.paused && vid.paused) forcePlay();
    });

    return () => {
      const vid = vmRef.current.videoRef.current;
      if (vid) vid.playbackRate = 1; // never leave a nudged rate behind
      v?.removeEventListener("play", onGuestPlay);
      v?.removeEventListener("canplay", trySendReady);
      v?.removeEventListener("seeked", trySendReady);
      unsub();
    };
  }, [role, onSyncMessage, sendGuestReady, clockOffsetRef]);
}

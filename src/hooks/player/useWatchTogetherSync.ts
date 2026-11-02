import { useCallback, useEffect, useRef } from "react";
import { useWatchTogether } from "../../context/watchTogetherState";
import { useClockSync } from "./useClockSync";
import type { useWebMediaPlayer } from "../useWebMediaPlayer";
import type { WTSyncWatch } from "../../network/watchTogetherTypes";
import { i18n } from "../../i18n";
import { logger } from "../../utils/logger";
import { startMediaPlayback, isAbortError } from "../../utils/mediaPlayback";

type PlayerVM = ReturnType<typeof useWebMediaPlayer>;

const SYNC_INTERVAL_MS = 1000;
const HARD_SEEK_SEC = 0.75; // error above this → hard seek (a real jump); below → smooth playbackRate nudge
const ALIGN_SEC = 0.2; // on a fresh coordinated round, hard-seek to align if off by more than this
const NUDGE_DEADBAND_SEC = 0.05; // within this, we're in sync — run at 1.0x
const MAX_RATE_DELTA = 0.1; // cap the speed nudge at ±10% so it stays imperceptible
const RATE_GAIN = 0.5; // rate delta per second of error
const MAX_EXTRAP_SEC = 2.0; // clamp the forward extrapolation so a stale/glitched timestamp can't fling us
const SEEK_SUPPRESS_MS = 1500;
const PLAY_RETRY_THROTTLE_MS = 2000; // min gap between guest autoplay retries (sync ticks arrive ~1/s)
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
  // The <video> node can be REPLACED after mount (a portal container swap recreates it) — effects that
  // attach listeners must key on the node itself, not the stable videoRef object.
  const videoNode = vm.videoNode;

  // Returns true when playback started, "aborted" when play() was interrupted by a pause (co-watch
  // gate hold on episode switch — the gate effect re-starts us), false on a real failure.
  const startSynchronizedPlayback = useCallback(async (video: HTMLVideoElement, context: string): Promise<boolean | "aborted"> => {
    const result = await startMediaPlayback(video);
    if (result.started) return true;
    if (isAbortError(result.error)) {
      // play() interrupted by a pause (co-watch gate hold on episode switch) — the gate effect
      // re-starts playback when it opens; this is not a failure.
      logger.log(`[watch-together] ${context} play() aborted by pause — ignoring`);
      return "aborted";
    }
    logger.error(`[watch-together] ${context} playback start failed:`, result.error, {
      readyState: video.readyState,
      networkState: video.networkState,
      mediaError: video.error?.code ?? null,
    });
    vmRef.current.setPlayerError(i18n.t("player:playback.loadFailed"));
    return false;
  }, []);

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
    const v = videoNode;
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
  }, [role, sessionActive, startGateOpen, videoNode, emitSync, clientId]);

  // Host: hold playback until the start gate opens (every guest has reported ready via the handshake, or a
  // timeout), THEN start once our own buffer is ready — so everyone begins together. While holding, the video
  // buffers and the 1 Hz sync reports paused=true, so guests stay paused too.
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    const v = videoNode;
    if (!v) return;

    if (!startGateOpen) {
      const keepPaused = () => v.pause();
      v.pause();
      v.addEventListener("play", keepPaused);
      return () => v.removeEventListener("play", keepPaused);
    }

    // Gate open — start as soon as the host's own buffer can play.
    if (v.readyState >= READY_STATE_CAN_PLAY) {
      void startSynchronizedPlayback(v, "host gate");
      return;
    }
    const onReady = () => void startSynchronizedPlayback(v, "host gate");
    v.addEventListener("canplay", onReady, { once: true });
    return () => v.removeEventListener("canplay", onReady);
  }, [role, sessionActive, startGateOpen, videoNode, startSynchronizedPlayback]);

  // Host: emit a "seek" toast on real seeks. (Pause/resume is shown to guests as a dedicated overlay driven
  // by the sync-watch paused flag, so it doesn't need a transient toast.)
  const primedRef = useRef(false);
  useEffect(() => {
    if (role !== "host" || !sessionActive) return;
    const v = videoNode;
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
  }, [role, sessionActive, videoNode, emitNotice, hostAwaitResync, clientId]);

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
      else if (c.action === "play") {
        pauseActorIdRef.current = clientId;
        void startSynchronizedPlayback(v, "host control");
      }
    });
  }, [role, sessionActive, onControl, clientId, startSynchronizedPlayback]);

  // Host: whenever the active episode changes (host used the playlist menu, or a permitted guest requested it),
  // the player remounts on the new descriptor — re-broadcast start-watch + re-run the ready-handshake so every
  // guest switches to the same episode and everyone restarts in sync. The initial episode is a no-op (guarded).
  useEffect(() => {
    if (role === "host" && sessionActive) hostAnnounceEpisode(vmRef.current.playback);
  }, [role, sessionActive, vm.playback.streamUrl, hostAnnounceEpisode]);

  // Guest: follow the host. Rewritten as an explicit state machine (see the module notes above): one
  // decision pass — pause / start / align — driven by every sync-watch AND a 1 s self-tick, with a log
  // line for every state transition. No latches that can silently park the guest on a black screen.
  const suppressUntilRef = useRef(0);
  const readiedRoundRef = useRef(-1); // highest coordinated round we've reported ready for
  useEffect(() => {
    if (role !== "guest") return;
    const initialVideo = videoNode;
    const log = (...args: unknown[]) => logger.log("[WT-GUEST]", ...args);

    let lastHost: WTSyncWatch | null = null;
    let started = false;
    let playInFlight = false;
    let lastPlayAttemptAt = 0;
    let queuedVideo: HTMLVideoElement | null = null;
    let queuedHandler: (() => void) | null = null;
    let lastProbeAt = 0;
    let lastStuckLogAt = 0;

    // Element truth snapshot: one line that discriminates every black-screen cause — a seek that
    // didn't stick (currentTime vs target), a clamped timeline (duration/seekable end below the
    // host's position), a detached/hidden element (isConnected/box), or a never-started playback.
    const probe = (hostTime: number | null, force = false) => {
      const now = Date.now();
      if (!force && now - lastProbeAt < 2000) return;
      lastProbeAt = now;
      const vid = vmRef.current.videoRef.current;
      if (!vid) { log("probe: no <video>"); return; }
      const seekableEnd = vid.seekable.length ? vid.seekable.end(vid.seekable.length - 1) : null;
      log("probe", {
        want: hostTime != null ? Number(hostTime.toFixed(2)) : null,
        cur: Number(vid.currentTime.toFixed(2)),
        paused: vid.paused,
        rs: vid.readyState,
        dur: Number.isFinite(vid.duration) ? Number(vid.duration.toFixed(1)) : vid.duration,
        seekEnd: seekableEnd != null ? Number(seekableEnd.toFixed(1)) : null,
        rate: vid.playbackRate,
        conn: vid.isConnected,
        box: `${vid.clientWidth}x${vid.clientHeight}`,
        vw: vid.videoWidth,
      });
    };

    const seekTo = (time: number) => {
      vmRef.current.handleSeek(time);
      suppressUntilRef.current = Date.now() + SEEK_SUPPRESS_MS;
      log("seek →", Number(time.toFixed(2)));
      // Verify the seek actually landed ~400 ms after the debounced commit. If it didn't, the next
      // probe line (with dur/seekEnd) shows why: clamped timeline, detached element, or paused playback.
      const issuedAt = Date.now();
      setTimeout(() => {
        if (Date.now() - lastStuckLogAt < 2000) return;
        const vid = vmRef.current.videoRef.current;
        if (!vid) return;
        if (Math.abs(vmRef.current.seekOffset + vid.currentTime - time) > 1) {
          lastStuckLogAt = Date.now();
          log(`seek to ${Number(time.toFixed(2))} did not stick after ${Date.now() - issuedAt} ms`);
          probe(time, true);
        }
      }, 400);
    };

    const setRate = (rate: number) => {
      const vid = vmRef.current.videoRef.current;
      if (vid && Math.abs(vid.playbackRate - rate) > 0.001) vid.playbackRate = rate;
    };

    const clearQueued = () => {
      if (queuedVideo && queuedHandler) queuedVideo.removeEventListener("canplay", queuedHandler);
      queuedVideo = null;
      queuedHandler = null;
    };

    // Autoplay-with-sound may be blocked (no user gesture); startMediaPlayback falls back to muted.
    // A failure is retried on a throttle — never latched: any later user interaction restores activation
    // and the next retry starts playback.
    const attemptPlay = (vid: HTMLVideoElement) => {
      if (playInFlight) return;
      const now = Date.now();
      if (lastPlayAttemptAt !== 0 && now - lastPlayAttemptAt < PLAY_RETRY_THROTTLE_MS) return;
      lastPlayAttemptAt = now;
      playInFlight = true;
      void startSynchronizedPlayback(vid, "guest").then((result) => {
        if (result === true) {
          started = true;
          log("playback started");
        } else if (result === "aborted") {
          // Gate hold paused us mid-play() — the host's gate will start everyone when it opens.
        } else {
          log("play() blocked by autoplay policy — retrying on the next tick");
        }
      }).finally(() => {
        playInFlight = false;
      });
    };

    // Ready-handshake: report ready for the current round once buffered at the synced position.
    const trySendReady = () => {
      const vid = vmRef.current.videoRef.current;
      const host = lastHost;
      if (!vid || !host) return;
      const round = host.round ?? 0;
      if (round <= readiedRoundRef.current) return;
      if (vid.readyState < READY_STATE_CAN_PLAY) return;
      readiedRoundRef.current = round;
      log("ready for round", round);
      sendGuestReady(round);
    };

    // The whole follower in one pass. Returns silently when there's nothing to do; logs every transition.
    const follow = () => {
      const vid = vmRef.current.videoRef.current;
      const host = lastHost;
      if (!vid) return;
      if (!host) {
        // No sync yet (shouldn't outlive the ready-handshake for long) — say so once in a while is
        // unnecessary noise; silent is fine, the self-tick retries anyway.
        return;
      }

      if (host.paused) {
        started = false;
        if (!vid.paused) {
          setRate(1);
          vid.pause();
          log("paused by host");
        }
        return;
      }

      // Pipeline dead (fatal HLS error) — pause/play/seek churn only hammers the CDN with requests
      // the broken pipeline can't consume. Sit still until the error is cleared (recovery/refresh
      // re-inits the pipeline, which re-fires the round-align seek anyway).
      if (vmRef.current.playerError) return;

      // Host is playing.
      if (vid.paused) {
        if (vid.readyState >= READY_STATE_CAN_PLAY) {
          attemptPlay(vid);
        } else if (queuedVideo !== vid) {
          // Not enough data to play yet — queue one attempt for canplay instead of a play() the
          // browser would reject on an unready source.
          clearQueued();
          queuedVideo = vid;
          queuedHandler = () => attemptPlay(vid);
          vid.addEventListener("canplay", queuedHandler, { once: true });
        }
      } else if (!started) {
        started = true;
        log("playback running");
      }

      if (vid.paused || Date.now() < suppressUntilRef.current) return; // settling — no drift chasing

      const target = hostTargetTime(host, clockOffsetRef.current);
      const err = target - logicalTime(); // +: guest is behind the host
      if (Math.abs(err) >= HARD_SEEK_SEC) {
        setRate(1);
        seekTo(target);
      } else if (Math.abs(err) >= NUDGE_DEADBAND_SEC) {
        setRate(1 + clamp(err * RATE_GAIN, -MAX_RATE_DELTA, MAX_RATE_DELTA)); // ease toward the host
      } else {
        setRate(1); // in sync
      }
      probe(target);
    };

    // Snap to the host's position whenever the guest actually starts playing (e.g. after a blocked-then-retried start).
    const onGuestPlay = () => {
      const host = lastHost;
      if (!host) return;
      const target = hostTargetTime(host, clockOffsetRef.current);
      if (Math.abs(logicalTime() - target) >= HARD_SEEK_SEC) seekTo(target);
    };

    initialVideo?.addEventListener("play", onGuestPlay);
    initialVideo?.addEventListener("canplay", trySendReady);
    initialVideo?.addEventListener("seeked", trySendReady);

    const unsub = onSyncMessage((msg) => {
      const vid = vmRef.current.videoRef.current;
      lastHost = msg;
      if (!vid) {
        log("sync received but the <video> ref is null — player not mounted?");
        return;
      }
      const round = msg.round ?? 0;
      if (round > readiedRoundRef.current) {
        // New coordinated round (start / episode / seek): align to the host's position — even while
        // paused, since the host holds paused until everyone is ready — then report ready once buffered.
        setRate(1);
        const target = hostTargetTime(msg, clockOffsetRef.current);
        if (Math.abs(target - logicalTime()) >= ALIGN_SEC) seekTo(target);
        trySendReady();
      }
      follow();
    });

    // Self-tick: the follower must not depend solely on the host's 1 Hz sync cadence — a lost message or
    // a play() that became possible late (user gesture) self-heals on the next tick.
    const tick = setInterval(follow, 1000);

    return () => {
      clearInterval(tick);
      const vid = vmRef.current.videoRef.current;
      if (vid) vid.playbackRate = 1; // never leave a nudged rate behind
      clearQueued();
      initialVideo?.removeEventListener("play", onGuestPlay);
      initialVideo?.removeEventListener("canplay", trySendReady);
      initialVideo?.removeEventListener("seeked", trySendReady);
      unsub();
    };
  }, [role, onSyncMessage, sendGuestReady, clockOffsetRef, videoNode, startSynchronizedPlayback]);
}

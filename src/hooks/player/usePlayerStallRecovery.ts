import { useEffect, useRef, type RefObject } from "react";
import type Hls from "hls.js";
import { logger } from "../../utils/logger";

// Watchdog cadence and thresholds. Deliberately conservative so we never fight normal playback:
// we only act after the playhead has been frozen for STALL_THRESHOLD_MS while data is available.
const CHECK_INTERVAL_MS = 1000;
const STALL_THRESHOLD_MS = 2000;
// Contiguous buffer past the playhead longer than this ⇒ a decode/discontinuity stall (not an
// underrun hls.js would handle by loading more) ⇒ a micro-nudge re-primes the decoder.
const MIN_BUFFER_AHEAD = 0.5;
// A hole this small or smaller with more buffered data just past it ⇒ jump into it (hls.js only
// auto-crosses holes up to maxBufferHole, 0.5s; larger transcode gaps otherwise wedge the playhead).
const MAX_GAP_JUMP = 10;
const NUDGE = 0.1;
const MAX_NUDGES_BEFORE_RELOAD = 4;

interface UsePlayerStallRecoveryParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  // Off while metadata is still loading / the player is closed — no forward progress is expected yet.
  enabled: boolean;
}

/**
 * Recovers the kind of stall hls.js's gap controller misses: the playhead frozen mid-stream with a
 * full buffer and a high readyState, emitting no `waiting`/`error` — a decode stall at a transcoded
 * segment boundary. Manually seeking fixes it because a seek re-primes the decoder; this does the
 * same tiny seek automatically. Only fires when data is actually available ahead, so a genuine
 * underrun is left to hls.js.
 */
export function usePlayerStallRecovery({ videoRef, hlsRef, enabled }: UsePlayerStallRecoveryParams) {
  const lastTimeRef = useRef(-1);
  const stalledSinceRef = useRef<number | null>(null);
  const nudgeCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      stalledSinceRef.current = null;
      nudgeCountRef.current = 0;
    };

    // Where to seek to escape the freeze, or null when the buffer offers no recovery point.
    const recoveryTarget = (v: HTMLVideoElement): number | null => {
      const t = v.currentTime;
      let containingEnd = -1;
      let nextStart = Infinity;
      for (let i = 0; i < v.buffered.length; i++) {
        const start = v.buffered.start(i);
        const end = v.buffered.end(i);
        if (t >= start - 0.1 && t < end) containingEnd = end;
        else if (start > t && start < nextStart) nextStart = start;
      }
      // Contiguous data ahead → decode stall → escalating micro-nudge past the stuck frame.
      if (containingEnd - t >= MIN_BUFFER_AHEAD) return t + NUDGE * nudgeCountRef.current;
      // A gap the decoder won't cross, but buffered data resumes soon → jump into it.
      if (nextStart !== Infinity && nextStart - t <= MAX_GAP_JUMP) return nextStart + 0.05;
      // Nothing buffered ahead → genuine underrun; let hls.js fetch more.
      return null;
    };

    const timer = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;

      // States where a frozen currentTime is expected — never nudge here.
      if (v.paused || v.seeking || v.ended || v.readyState < 2) {
        lastTimeRef.current = v.currentTime;
        reset();
        return;
      }

      const advanced = Math.abs(v.currentTime - lastTimeRef.current) > 0.01;
      lastTimeRef.current = v.currentTime;
      if (advanced) {
        reset();
        return;
      }

      // Frozen. Start (or continue) the stall window.
      const now = performance.now();
      if (stalledSinceRef.current === null) {
        stalledSinceRef.current = now;
        return;
      }
      if (now - stalledSinceRef.current < STALL_THRESHOLD_MS) return;

      nudgeCountRef.current += 1;
      const target = recoveryTarget(v);
      if (target === null) {
        // Underrun — hand it back to hls.js and keep watching without thrashing the playhead.
        stalledSinceRef.current = now;
        return;
      }

      logger.warn(
        `[stall-recovery] playhead frozen ${Math.round(now - stalledSinceRef.current)}ms at ${v.currentTime.toFixed(2)}s with buffer ahead — seeking to ${target.toFixed(2)}s (attempt ${nudgeCountRef.current})`,
      );
      try {
        v.currentTime = target;
        void v.play().catch(() => {});
      } catch (err) {
        logger.error("[stall-recovery] nudge failed:", err);
      }
      stalledSinceRef.current = now;

      // Repeated nudges didn't take → force hls.js to rebuild the buffer around the playhead.
      if (nudgeCountRef.current >= MAX_NUDGES_BEFORE_RELOAD) {
        logger.warn("[stall-recovery] nudges exhausted — forcing hls.startLoad()");
        hlsRef.current?.startLoad();
        nudgeCountRef.current = 0;
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [enabled, videoRef, hlsRef]);
}

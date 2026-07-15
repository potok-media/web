import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { WTPong } from "../../network/watchTogetherTypes";

const SAMPLE_WINDOW = 8; // keep the last N pongs; the best (lowest-RTT) one drives the estimate
const BURST_COUNT = 4; // rapid pings on start so the offset converges before playback settles
const BURST_INTERVAL_MS = 300;
const STEADY_INTERVAL_MS = 10000; // then re-probe occasionally to track clock drift
const MAX_PLAUSIBLE_RTT_MS = 5000; // discard obviously bad round-trips (tab throttling, GC pauses)

interface ClockSample {
  rtt: number;
  theta: number; // host clock minus guest clock (ms)
}

// Estimates the host↔guest clock offset (theta) from ping/pong round-trips (NTP/Cristian). The guest uses it to
// convert the host's timestamped sync into its own clock and cancel the one-way WAN delay. Returns a ref whose
// `.current` is the best offset in ms (0 until the first pong / when disabled) — read it without re-rendering.
export function useClockSync(
  enabled: boolean,
  sendPing: () => void,
  onPong: (cb: (p: WTPong) => void) => () => void,
  onSample?: (rttMs: number) => void, // called with the smoothed RTT after each pong (for the ping display)
): RefObject<number | null> {
  const offsetRef = useRef<number | null>(null); // null until the first pong — don't extrapolate on a guess
  const samplesRef = useRef<ClockSample[]>([]);
  const rttEmaRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      samplesRef.current = [];
      offsetRef.current = null;
      rttEmaRef.current = null;
      return;
    }

    const unsub = onPong((p) => {
      const t4 = Date.now();
      const rtt = t4 - p.t1 - (p.t3 - p.t2); // round-trip minus host processing time
      const theta = (p.t2 - p.t1 + (p.t3 - t4)) / 2; // NTP offset
      if (rtt < 0 || rtt > MAX_PLAUSIBLE_RTT_MS) return;

      const samples = samplesRef.current;
      samples.push({ rtt, theta });
      if (samples.length > SAMPLE_WINDOW) samples.shift();
      // The lowest-RTT sample is the least distorted by jitter/queuing, so trust its offset.
      offsetRef.current = samples.reduce((best, s) => (s.rtt < best.rtt ? s : best), samples[0]).theta;
      // A lightly-smoothed RTT for display (min-RTT would read optimistically low).
      rttEmaRef.current = rttEmaRef.current === null ? rtt : rttEmaRef.current * 0.7 + rtt * 0.3;
      onSample?.(Math.round(rttEmaRef.current));
    });

    let burstsLeft = BURST_COUNT;
    sendPing();
    const burst = setInterval(() => {
      sendPing();
      if (--burstsLeft <= 0) clearInterval(burst);
    }, BURST_INTERVAL_MS);
    const steady = setInterval(sendPing, STEADY_INTERVAL_MS);

    return () => {
      unsub();
      clearInterval(burst);
      clearInterval(steady);
    };
  }, [enabled, sendPing, onPong, onSample]);

  return offsetRef;
}

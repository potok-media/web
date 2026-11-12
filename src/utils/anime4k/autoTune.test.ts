import { describe, expect, it, vi } from "vitest";
import { createAutoTune, type PlaybackQualitySample } from "./autoTune";

function makeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
  };
}

function makeQuality() {
  let total = 0;
  let dropped = 0;
  return {
    present: (frames: number, drops = 0, jankRatio?: number): PlaybackQualitySample => {
      total += frames + drops;
      dropped += drops;
      return { totalVideoFrames: total, droppedVideoFrames: dropped, jankRatio };
    },
  };
}

describe("createAutoTune", () => {
  it("starts at the start tier clamped to the ceiling and never rises above the ceiling", () => {
    const tune = createAutoTune({ ceiling: "medium", startTier: "high" });
    expect(tune.tier()).toBe("medium");
  });

  it("ignores samples inside the sampling window and baselines on the first sample", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const onTierChange = vi.fn();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now, onTierChange });

    tune.sample(quality.present(60, 60)); // baseline (huge drop ratio — must be ignored)
    clock.advance(500);
    tune.sample(quality.present(60, 60)); // still inside the 2s window
    clock.advance(500);
    tune.sample(quality.present(60, 60));
    expect(onTierChange).not.toHaveBeenCalled();
  });

  it("steps down when the dropped-frame share exceeds the threshold", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const changes: Array<[string, string]> = [];
    const tune = createAutoTune({
      ceiling: "high",
      startTier: "high",
      now: clock.now,
      onTierChange: (tier, direction) => changes.push([tier, direction]),
    });

    tune.sample(quality.present(48)); // 2s @ 24fps baseline
    clock.advance(2000);
    tune.sample(quality.present(40, 8)); // 16.7% dropped → down
    expect(tune.tier()).toBe("medium");
    expect(changes).toEqual([["medium", "down"]]);
  });

  it("respects the step cooldown so transient stalls cannot ratchet to the floor", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now });

    tune.sample(quality.present(48));
    clock.advance(2000);
    tune.sample(quality.present(40, 8)); // → medium
    expect(tune.tier()).toBe("medium");

    clock.advance(2000);
    tune.sample(quality.present(40, 8)); // inside cooldown — no second step
    expect(tune.tier()).toBe("medium");

    clock.advance(5000);
    tune.sample(quality.present(40, 8)); // cooldown passed → light (floor)
    expect(tune.tier()).toBe("light");

    clock.advance(10000);
    tune.sample(quality.present(40, 8)); // floor reached — stays
    expect(tune.tier()).toBe("light");
  });

  it("steps down past a manual ceiling under load, then climbs back to the ceiling and stops", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "medium", startTier: "medium", now: clock.now });

    tune.sample(quality.present(48));
    clock.advance(2000);
    tune.sample(quality.present(40, 8)); // 16.7% dropped — down past the ceiling, to the floor
    expect(tune.tier()).toBe("light");

    // A sustained clean run climbs back — one step every cooldown + clean window.
    for (let i = 0; i < 12; i += 1) {
      clock.advance(2000);
      tune.sample(quality.present(48));
    }
    expect(tune.tier()).toBe("medium");

    // More clean windows must not rise above the manual ceiling.
    for (let i = 0; i < 12; i += 1) {
      clock.advance(2000);
      tune.sample(quality.present(48));
    }
    expect(tune.tier()).toBe("medium");
  });

  it("does not upgrade while drops keep occurring", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "medium", now: clock.now });

    tune.sample(quality.present(48));
    for (let i = 0; i < 10; i += 1) {
      clock.advance(2000);
      tune.sample(quality.present(47, 1)); // occasional drop keeps resetting the clean window
    }
    expect(tune.tier()).toBe("medium");
  });

  it("ignores windows where nothing presented (source stall)", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now });

    tune.sample(quality.present(48));
    clock.advance(4000);
    tune.sample(quality.present(0)); // stall — no frames at all
    clock.advance(2000);
    tune.sample(quality.present(0, 0));
    expect(tune.tier()).toBe("high");
  });

  it("uses the presented-fps floor when an expected fps is provided", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({
      ceiling: "high",
      startTier: "high",
      now: clock.now,
      downPresentedRatio: 0.85,
    });

    tune.sample(quality.present(60)); // 2s @ 30fps baseline
    clock.advance(2000);
    tune.sample(quality.present(40)); // 20fps presented, no drops → below 85% of 30 → down
    expect(tune.tier()).toBe("medium");
  });

  it("steps down on sustained rAF jank even with zero dropped video frames", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now });

    tune.sample(quality.present(48));
    clock.advance(2000);
    // Zero drops (the macOS quirk) but 60% of rAF intervals exceed the jank threshold.
    tune.sample(quality.present(48, 0, 0.6));
    expect(tune.tier()).toBe("medium");
  });

  it("jank downgrades work even when no playback-quality API exists (zero presented frames)", () => {
    const clock = makeClock();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now });
    const sample = (jankRatio: number) => ({ totalVideoFrames: 0, droppedVideoFrames: 0, jankRatio });

    tune.sample(sample(0));
    clock.advance(2000);
    tune.sample(sample(0.8));
    expect(tune.tier()).toBe("medium");
  });

  it("resets the clean window on jank, blocking upgrades until it settles", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "medium", now: clock.now });

    tune.sample(quality.present(48));
    for (let i = 0; i < 10; i += 1) {
      clock.advance(2000);
      // Alternating clean and janky windows: the clean clock keeps restarting.
      tune.sample(quality.present(48, 0, i % 2 === 0 ? 0.3 : 0));
    }
    expect(tune.tier()).toBe("medium");
  });

  it("reset re-seeds the tier and clears sampling state", () => {
    const clock = makeClock();
    const quality = makeQuality();
    const tune = createAutoTune({ ceiling: "high", startTier: "high", now: clock.now });

    tune.sample(quality.present(48));
    clock.advance(2000);
    tune.sample(quality.present(40, 8));
    expect(tune.tier()).toBe("medium");

    tune.reset("high");
    expect(tune.tier()).toBe("high");
    clock.advance(2000);
    tune.sample(quality.present(48)); // treated as a fresh baseline
    clock.advance(2000);
    tune.sample(quality.present(48));
    expect(tune.tier()).toBe("high");
  });
});

import { ANIME4K_TIERS, clampTier, tierIndex, type Anime4kTier } from "./profiles";

export interface PlaybackQualitySample {
  totalVideoFrames: number;
  droppedVideoFrames: number;
  /** Share of rAF intervals above the jank threshold in the window (0..1) — captures GPU
   *  contention that macOS browsers do NOT report via droppedVideoFrames. */
  jankRatio?: number;
}

export interface AutoTuneOptions {
  /** Highest tier the controller may select (user setting / "auto" = high). */
  ceiling: Anime4kTier;
  startTier: Anime4kTier;
  now?: () => number;
  onTierChange?: (tier: Anime4kTier, direction: "down" | "up") => void;
  /** Dropped-frame share of the window that triggers a downgrade. */
  downDropRatio?: number;
  /** Janky rAF-interval share that triggers a downgrade (sustained UI stutter). */
  downJankRatio?: number;
  /** Jank share still tolerated as "clean" for upgrades. */
  upJankRatio?: number;
  /** Optional presented-FPS floor (share of the expected fps); pass undefined to disable. */
  downPresentedRatio?: number;
  /** Sustained clean (zero-drop, low-jank) time before an upgrade is attempted. */
  upCleanMs?: number;
  /** Minimum interval between tier steps — keeps network/decode hiccups from ratcheting down. */
  stepCooldownMs?: number;
  /** Minimum sampling window; shorter deltas are ignored. */
  sampleWindowMs?: number;
}

export interface AutoTune {
  tier: () => Anime4kTier;
  sample: (quality: PlaybackQualitySample, expectedFps?: number) => void;
  reset: (tier: Anime4kTier) => void;
}

/**
 * Hardware-driven tier controller. Feeds on `video.getVideoPlaybackQuality()` deltas: a rising
 * dropped-frame share means the current shader chain does not fit the frame budget, so the tier
 * steps down (with a cooldown so a transient buffer stall can't ratchet to the floor); a long
 * clean run steps back up, but never above the ceiling. The caller owns persistence of the
 * resulting tier between sessions.
 */
export function createAutoTune(options: AutoTuneOptions): AutoTune {
  const {
    ceiling,
    startTier,
    now = () => Date.now(),
    onTierChange,
    downDropRatio = 0.08,
    downJankRatio = 0.5,
    upJankRatio = 0.1,
    downPresentedRatio,
    upCleanMs = 15_000,
    stepCooldownMs = 5_000,
    sampleWindowMs = 2_000,
  } = options;

  const lastIndex = ANIME4K_TIERS.length - 1;
  const ceilingIndex = tierIndex(ceiling);
  let currentIndex = tierIndex(clampTier(startTier, ceiling));
  let lastSample: (PlaybackQualitySample & { at: number }) | null = null;
  let lastStepAt = Number.NEGATIVE_INFINITY;
  let cleanSince: number | null = null;

  const step = (direction: "down" | "up") => {
    // Tiers are ordered best-first, so "down" (worse quality) walks toward the last index and
    // "up" walks toward index 0, stopping at the ceiling.
    const nextIndex = direction === "down"
      ? Math.min(lastIndex, currentIndex + 1)
      : Math.max(ceilingIndex, currentIndex - 1);
    if (nextIndex === currentIndex) return;
    currentIndex = nextIndex;
    lastStepAt = now();
    cleanSince = null;
    onTierChange?.(ANIME4K_TIERS[currentIndex], direction);
  };

  return {
    tier: () => ANIME4K_TIERS[currentIndex],
    reset: (tier: Anime4kTier) => {
      currentIndex = tierIndex(clampTier(tier, ceiling));
      lastSample = null;
      lastStepAt = Number.NEGATIVE_INFINITY;
      cleanSince = null;
    },
    sample: (quality: PlaybackQualitySample, expectedFps?: number) => {
      const at = now();
      const baseline = lastSample;
      lastSample = { ...quality, at };
      if (!baseline) return;

      const windowMs = at - baseline.at;
      if (windowMs < sampleWindowMs) return;
      const totalDelta = quality.totalVideoFrames - baseline.totalVideoFrames;
      const droppedDelta = quality.droppedVideoFrames - baseline.droppedVideoFrames;
      const dropRatio = totalDelta > 0 ? Math.max(0, droppedDelta) / totalDelta : 0;
      const presentedFps = (totalDelta / windowMs) * 1000;
      const canStep = at - lastStepAt >= stepCooldownMs;

      const tooManyDrops = dropRatio > downDropRatio;
      const tooJanky = (quality.jankRatio ?? 0) > downJankRatio;
      const tooSlowPresented =
        downPresentedRatio != null &&
        expectedFps != null &&
        expectedFps > 0 &&
        presentedFps < expectedFps * downPresentedRatio;

      if ((tooManyDrops || tooJanky || tooSlowPresented) && currentIndex < lastIndex && canStep) {
        step("down");
        return;
      }

      // A source stall (nothing presented) carries no GPU evidence either way — only real
      // drops and measured jank reset the clean window.
      const unclean = droppedDelta > 0 || (quality.jankRatio ?? 0) > upJankRatio;
      if (unclean) {
        cleanSince = null;
        return;
      }
      if (totalDelta <= 0 || currentIndex <= ceilingIndex || !canStep) return;
      cleanSince ??= baseline.at;
      if (at - cleanSince >= upCleanMs) step("up");
    },
  };
}

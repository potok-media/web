import { useEffect, useState, type RefObject } from "react";
import { VideoUpscaler } from "anime4k.js";
import {
  ANIME4K_PROFILES,
  clampTier,
  getLearnedTier,
  guessInitialTier,
  setLearnedTier,
  type Anime4kTier,
} from "../../utils/anime4k/profiles";
import { createAutoTune } from "../../utils/anime4k/autoTune";

const QUALITY_SAMPLE_INTERVAL_MS = 2000;

let cachedSupport: boolean | null = null;
/** WebGL1 + float-linear gate of the engine. Memoized — support does not change mid-session. */
export function isAnime4kSupported(): boolean {
  if (cachedSupport == null) cachedSupport = VideoUpscaler.isSupported();
  return cachedSupport;
}

interface UseAnime4kUpscaleParams {
  /** Live <video> node — re-attaches on portal swaps that recreate the node. */
  videoNode: HTMLVideoElement | null;
  /** External decision: setting on + (anime or forced) + no native subtitles + no PiP + output bigger than source. */
  active: boolean;
  /** Highest tier allowed (the user setting; "auto" resolves to high before anime gating). */
  ceiling: Anime4kTier;
  /** Canvas rendered by the video surface; the engine owns its pixel size and visibility. */
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Drives the Anime4K WebGL engine over the player video. The effective tier starts at the
 * device-learned tier clamped to the ceiling; the auto-tune controller then measures real
 * playback-quality deltas and steps the tier up/down — each change recreates the engine with
 * the next profile and persists the learned tier for future sessions.
 */
export function useAnime4kUpscale({ videoNode, active, ceiling, canvasRef }: UseAnime4kUpscaleParams) {
  const [tier, setTier] = useState<Anime4kTier>(() => getLearnedTier() ?? guessInitialTier());

  useEffect(() => {
    if (!active || !videoNode || !isAnime4kSupported()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const effectiveTier = clampTier(tier, ceiling);
    const upscaler = new VideoUpscaler(ANIME4K_PROFILES[effectiveTier]);
    // npm 1.1.9 API: two-arg attach, canvas pixel size is source×2 (CSS fits it to the display).
    upscaler.attachVideo(videoNode, canvas);
    upscaler.start();

    const tune = createAutoTune({
      ceiling,
      startTier: effectiveTier,
      onTierChange: (nextTier) => {
        setLearnedTier(nextTier);
        setTier(nextTier);
      },
    });

    // rAF probe: the droppedVideoFrames signal is unreliable on macOS browsers (the compositor
    // keeps presenting on time while the GPU saturates), so interface stutter is measured
    // directly — rAF intervals longer than the jank threshold mean the page can't keep its
    // frame cadence and the tier should step down.
    let rafId = 0;
    let lastRafAt = 0;
    let rafIntervals: number[] = [];
    const JANK_FRAME_MS = 25;
    const probe = (timestamp: number) => {
      if (lastRafAt > 0) rafIntervals.push(timestamp - lastRafAt);
      lastRafAt = timestamp;
      rafId = requestAnimationFrame(probe);
    };
    rafId = requestAnimationFrame(probe);

    // getVideoPlaybackQuality is Chromium/Safari-standard; when missing the engine just runs
    // at the current tier without adaptation.
    const sampleTimer = window.setInterval(() => {
      const quality = videoNode.getVideoPlaybackQuality?.();
      const intervals = rafIntervals;
      rafIntervals = [];
      const jankRatio = intervals.length > 0
        ? intervals.filter((ms) => ms > JANK_FRAME_MS).length / intervals.length
        : undefined;
      if (!quality && jankRatio == null) return;
      tune.sample({
        totalVideoFrames: quality?.totalVideoFrames ?? 0,
        droppedVideoFrames: quality?.droppedVideoFrames ?? 0,
        jankRatio,
      });
    }, QUALITY_SAMPLE_INTERVAL_MS);

    return () => {
      window.clearInterval(sampleTimer);
      cancelAnimationFrame(rafId);
      upscaler.detachVideo();
    };
  }, [active, videoNode, ceiling, tier, canvasRef]);

  return { tier, supported: isAnime4kSupported() };
}

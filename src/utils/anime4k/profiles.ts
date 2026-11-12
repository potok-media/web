import {
  ANIME4K_HIGHEREND_MODE_A,
  ANIME4K_LOWEREND_MODE_A,
  ANIME4KJS_SIMPLE_S_2X,
  ignoreAutoDownscalePre,
} from "anime4k.js";

/** Quality ladder, best first. `light` is the floor — auto-tune never goes below it. */
export const ANIME4K_TIERS = ["high", "medium", "light"] as const;
export type Anime4kTier = (typeof ANIME4K_TIERS)[number];

export type Anime4kProfileConfig = typeof ANIME4KJS_SIMPLE_S_2X;

/**
 * The three highest-quality Anime4K v4 chains, descending:
 * - high:    HIGHEREND Mode A — Restore_CNN_VL + Upscale_CNN_x2_VL, second M pass (1080p→4K max quality)
 * - medium:  LOWEREND Mode A  — the official "Mode A" (M + S two-pass) for mid-range GPUs
 * - light:   SIMPLE S         — single Clamp + Restore_S + Upscale_x2_S pass for weak iGPUs
 *
 * The AutoDownscalePre passes are stripped from the Mode-A chains: mpv bakes them in for
 * 1080p displays, but this player renders the canvas at a flat source×2 and lets CSS fit any
 * display — the pre-downscales would only cut effective output resolution.
 */
export const ANIME4K_PROFILES: Record<Anime4kTier, Anime4kProfileConfig> = {
  high: ignoreAutoDownscalePre(ANIME4K_HIGHEREND_MODE_A),
  medium: ignoreAutoDownscalePre(ANIME4K_LOWEREND_MODE_A),
  light: ANIME4KJS_SIMPLE_S_2X,
};

export const tierIndex = (tier: Anime4kTier): number => ANIME4K_TIERS.indexOf(tier);

export const clampTier = (tier: Anime4kTier, ceiling: Anime4kTier): Anime4kTier =>
  tierIndex(tier) > tierIndex(ceiling) ? ceiling : tier;

const LEARNED_TIER_KEY = "potok:anime4k-tier";

/** Device-learned tier from previous sessions (written by the auto-tune controller). */
export function getLearnedTier(): Anime4kTier | null {
  try {
    const raw = localStorage.getItem(LEARNED_TIER_KEY);
    return (ANIME4K_TIERS as readonly string[]).includes(raw ?? "") ? (raw as Anime4kTier) : null;
  } catch {
    return null;
  }
}

export function setLearnedTier(tier: Anime4kTier): void {
  try {
    localStorage.setItem(LEARNED_TIER_KEY, tier);
  } catch {
    // storage unavailable — the tier just doesn't persist
  }
}

/**
 * First-run guess before any measurement exists. Deliberately coarse: RAM and core count
 * correlate with the GPU class well enough for a starting point — the auto-tune controller
 * corrects it within seconds of real playback.
 */
export function guessInitialTier(): Anime4kTier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  if (memory != null && memory <= 4) return "light";
  if (cores >= 8 && memory != null && memory >= 8) return "high";
  if (cores >= 6) return "medium";
  return "light";
}

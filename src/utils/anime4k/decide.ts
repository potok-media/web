import type { Anime4kUpscalePref } from "./prefs";
import type { Anime4kTier } from "./profiles";

/**
 * Setting → effective tier ceiling. `auto` means "anime-detected, best allowed"; a concrete
 * tier is the ceiling with auto-downgrade still active; `off` / unsupported disable the
 * pipeline. The result is only a ceiling — the runtime tier may sit below it.
 */
export function resolveUpscaleCeiling(
  pref: Anime4kUpscalePref,
  context: { supported: boolean; isAnime: boolean },
): Anime4kTier | null {
  if (!context.supported || pref === "off") return null;
  if (pref === "auto") return context.isAnime ? "high" : null;
  return pref;
}

/**
 * Native text tracks paint on the video element itself — with the element hidden (the
 * upscaled canvas replaces it visually) they would vanish, so the upscaler steps aside for
 * them. ASS/SSA tracks render through the libass overlay canvas and keep working.
 */
export function isNativeSubtitleTrackShowing(track: { codec?: string } | null | undefined): boolean {
  return track != null && track.codec !== "ass" && track.codec !== "ssa";
}

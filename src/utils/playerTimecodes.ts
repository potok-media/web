import type { ArmClient } from "../network/ArmApiClient";
import type { ArmReleaseVariantSegmentsResponse } from "../network/ArmTypes";

export interface TimecodeRange {
  start: number;
  end: number;
}

export interface PlayerTimecodes {
  introRange: TimecodeRange | null;
  outroRange: TimecodeRange | null;
}

export interface PlayerTimecodesRequest {
  tmdbId: number;
  season?: number;
  episode?: number;
  armEpisodeId?: string | null;
  isTv: boolean;
  durationMs: number;
}

interface TimecodeSources {
  getEpisodeSegments: ArmClient["getEpisodeSegments"];
  fetch: typeof fetch;
}

export const EMPTY_TIMECODES: PlayerTimecodes = { introRange: null, outroRange: null };
// Keep aligned with the Gateway's episode-segment release selection policy.
const ARM_DURATION_TOLERANCE_MS = 2000;
const REQUEST_TIMEOUT_MS = 5000;

function range(startMs: unknown, endMs: unknown, durationMs: number): TimecodeRange | null {
  if (typeof startMs !== "number" || typeof endMs !== "number"
    || !Number.isFinite(startMs) || !Number.isFinite(endMs)
    || startMs < 0 || endMs <= startMs || endMs > durationMs) return null;
  return { start: startMs / 1000, end: endMs / 1000 };
}

function armTimecodes(
  data: ArmReleaseVariantSegmentsResponse | undefined,
  episodeId: string,
  durationMs: number,
): PlayerTimecodes {
  const variant = data?.releaseVariant;
  if (!variant || variant.episodeId !== episodeId
    || (data?.resolutionState !== "resolved" && data?.resolutionState !== "partial")
    || typeof variant.durationMs !== "number" || !Number.isFinite(variant.durationMs)
    || variant.durationMs <= 0 || Math.abs(variant.durationMs - durationMs) > ARM_DURATION_TOLERANCE_MS
    || !Array.isArray(data.segments)) return EMPTY_TIMECODES;

  const segments = data.segments
    .filter((segment) => segment.releaseVariantId === variant.id)
    .toSorted((a, b) => a.startMs - b.startMs);
  const firstRange = (kinds: string[]) => {
    for (const segment of segments) {
      if (!kinds.includes(segment.kind)) continue;
      const valid = range(segment.startMs, segment.endMs, durationMs);
      if (valid) return valid;
    }
    return null;
  };
  return { introRange: firstRange(["opening", "intro"]), outroRange: firstRange(["ending", "credits"]) };
}

function introDbTimecodes(data: unknown, durationMs: number): PlayerTimecodes {
  if (typeof data !== "object" || data === null) return EMPTY_TIMECODES;
  const firstRange = (items: unknown, credits: boolean) => {
    if (!Array.isArray(items)) return null;
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      // TheIntroDB uses null to denote the start/end of the media; missing fields are invalid.
      const start = item.start_ms === null ? 0 : item.start_ms;
      const end = credits && item.end_ms === null ? durationMs : item.end_ms;
      const valid = range(start, end, durationMs);
      if (valid) return valid;
    }
    return null;
  };
  return {
    introRange: firstRange("intro" in data ? data.intro : undefined, false),
    outroRange: firstRange("credits" in data ? data.credits : undefined, true),
  };
}

async function withTimeout<T>(request: (signal: AbortSignal) => Promise<T>, signal: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal.aborted) controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

/** ARM selects a compatible release; TheIntroDB fills only ranges ARM could not supply. */
export async function loadPlayerTimecodes(
  request: PlayerTimecodesRequest,
  sources: TimecodeSources,
  signal: AbortSignal,
): Promise<PlayerTimecodes> {
  const { tmdbId, season, episode, armEpisodeId, isTv, durationMs } = request;
  if (!isTv || !Number.isSafeInteger(durationMs) || durationMs <= 0 || signal.aborted) return EMPTY_TIMECODES;
  let arm = EMPTY_TIMECODES;
  if (armEpisodeId) {
    try {
      const response = await withTimeout((signal) => sources.getEpisodeSegments(armEpisodeId, { durationMs, signal }), signal);
      if (signal.aborted) return EMPTY_TIMECODES;
      arm = armTimecodes(response.status === 200 ? response.body : undefined, armEpisodeId, durationMs);
      if (arm.introRange && arm.outroRange) return arm;
    } catch {
      // Provider outages and timeout are ordinary fallback conditions.
    }
  }

  // Missing coordinates must not silently fetch S1E1; season zero is a valid TMDB special.
  if (signal.aborted) return EMPTY_TIMECODES;
  if (!Number.isInteger(tmdbId) || tmdbId <= 0
    || season === undefined || !Number.isInteger(season) || season < 0
    || episode === undefined || !Number.isInteger(episode) || episode <= 0) return arm;
  try {
    const params = new URLSearchParams({
      tmdb_id: String(tmdbId), season: String(season), episode: String(episode), duration_ms: String(durationMs),
    });
    const fallback = await withTimeout(async (requestSignal) => {
      const response = await sources.fetch(`https://api.theintrodb.org/v3/media?${params}`, {
        headers: { Accept: "application/json" }, signal: requestSignal,
      });
      if (!response.ok) return EMPTY_TIMECODES;
      const data: unknown = await response.json();
      return introDbTimecodes(data, durationMs);
    }, signal);
    return signal.aborted ? EMPTY_TIMECODES : {
      introRange: arm.introRange ?? fallback.introRange,
      outroRange: arm.outroRange ?? fallback.outroRange,
    };
  } catch {
    return signal.aborted ? EMPTY_TIMECODES : arm;
  }
}

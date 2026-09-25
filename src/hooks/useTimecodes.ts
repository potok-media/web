import { useEffect, useState } from "react";
import { ApiClient } from "../network/ApiClient";
import { EMPTY_TIMECODES, loadPlayerTimecodes, type PlayerTimecodes, type PlayerTimecodesRequest } from "../utils/playerTimecodes";

export type { TimecodeRange } from "../utils/playerTimecodes";

export function useTimecodes({
  tmdbId, season, episode, armEpisodeId, isTv, duration, streamUrl,
}: Omit<PlayerTimecodesRequest, "durationMs"> & { duration: number; streamUrl: string }) {
  // Keep the millisecond duration within the media timeline, including fractional-ms containers.
  const durationMs = Number.isFinite(duration) && duration > 0 ? Math.floor(duration * 1000) : 0;
  const requestKey = JSON.stringify([tmdbId, season, episode, armEpisodeId, isTv, durationMs, streamUrl]);
  const [result, setResult] = useState<{ key: string; ranges: PlayerTimecodes } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadPlayerTimecodes(
      { tmdbId, season, episode, armEpisodeId, isTv, durationMs },
      {
        getEpisodeSegments: (episodeId, options) => ApiClient.fetchArmEpisodeSegments(episodeId, options),
        fetch: (...args) => fetch(...args),
      },
      controller.signal,
    ).then((ranges) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, ranges });
    });
    return () => controller.abort();
  }, [tmdbId, season, episode, armEpisodeId, isTv, durationMs, requestKey]);

  // Hide the previous episode/release's ranges before the cleanup effect runs.
  if (result?.key !== requestKey) return EMPTY_TIMECODES;
  return {
    introRange: result.ranges.introRange && result.ranges.introRange.end <= duration ? result.ranges.introRange : null,
    outroRange: result.ranges.outroRange && result.ranges.outroRange.end <= duration ? result.ranges.outroRange : null,
  };
}

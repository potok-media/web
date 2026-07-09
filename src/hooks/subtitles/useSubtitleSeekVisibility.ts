import { useEffect, useRef, type RefObject } from "react";
import type { SubtitlesOctopusInstance } from "../useSubtitlesOctopus";

export function useSubtitleSeekVisibility(
  seekPreview: number | null,
  videoRef: RefObject<HTMLVideoElement | null>,
  seekOffsetRef: RefObject<number>,
  octopusRef: RefObject<SubtitlesOctopusInstance | null>,
) {
  const hiddenTracksRef = useRef<number[]>([]);

  useEffect(() => {
    const seeking = seekPreview != null;
    const oct = octopusRef.current;
    const video = videoRef.current;
    if (oct?.canvas) {
      (oct.canvas as HTMLElement).classList.toggle("player-subs-hidden", seeking);
    }
    if (!video) return;
    if (seeking) {
      const hidden: number[] = [];
      Array.from(video.textTracks).forEach((tt, i) => {
        if (tt.mode === "showing") {
          tt.mode = "hidden";
          hidden.push(i);
        }
      });
      hiddenTracksRef.current = hidden;
    } else {
      hiddenTracksRef.current.forEach((i) => {
        const tt = video.textTracks[i];
        if (tt && tt.mode === "hidden") tt.mode = "showing";
      });
      hiddenTracksRef.current = [];
      if (oct) {
        try {
          oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
        } catch {
          /* noop */
        }
      }
    }
  }, [seekPreview, octopusRef, seekOffsetRef, videoRef]);
}
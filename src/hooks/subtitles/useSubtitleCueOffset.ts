import { useEffect, useRef, type RefObject } from "react";
import type { InjectedSubtitleTrack } from "./subtitleTypes";

export function useSubtitleCueOffset(
  videoRef: RefObject<HTMLVideoElement | null>,
  seekOffset: number,
  currentSubtitleTrack: number,
  injectedSubtitles: InjectedSubtitleTrack[],
  srcResetCounter: number,
) {
  const cueOriginalTimes = useRef<WeakMap<TextTrackCue, { s: number; e: number }>>(new WeakMap());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyCueOffset = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const inj = injectedSubtitles[i];
        const isAss = inj ? inj.codec === "ass" || inj.codec === "ssa" : false;
        if (isAss) continue;
        const cues = video.textTracks[i].cues;
        if (!cues) continue;
        for (let j = 0; j < cues.length; j++) {
          const cue = cues[j] as TextTrackCue;
          let orig = cueOriginalTimes.current.get(cue);
          if (!orig) {
            orig = { s: cue.startTime, e: cue.endTime };
            cueOriginalTimes.current.set(cue, orig);
          }
          const ns = orig.s - seekOffset;
          const ne = orig.e - seekOffset;
          if (cue.startTime !== ns) cue.startTime = ns;
          if (cue.endTime !== ne) cue.endTime = ne;
        }
      }
    };

    applyCueOffset();
    const timers = [window.setTimeout(applyCueOffset, 150), window.setTimeout(applyCueOffset, 600)];
    return () => timers.forEach((timerId) => clearTimeout(timerId));
  }, [seekOffset, currentSubtitleTrack, injectedSubtitles, srcResetCounter, videoRef]);

  return cueOriginalTimes;
}
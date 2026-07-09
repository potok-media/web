import { useEffect, type RefObject } from "react";
import { SUBTITLE_WINDOW_SEC } from "../usePlayerMetadataAndTracks";
import type { SubtitlesOctopusInstance } from "../useSubtitlesOctopus";
import type { InjectedSubtitleTrack } from "./subtitleTypes";

export function useWindowedSubtitleFeeder(
  videoRef: RefObject<HTMLVideoElement | null>,
  currentSubtitleTrack: number,
  injectedSubtitles: InjectedSubtitleTrack[],
  fetchSubtitleWindow: (track: InjectedSubtitleTrack, bucket: number) => Promise<string> | null,
  markSubtitle: (id: string, val: "ready" | "error", gen: number) => void,
  subtitleGen: RefObject<number>,
  octopusRef: RefObject<SubtitlesOctopusInstance | null>,
  seekOffsetRef: RefObject<number>,
  cueOriginalTimes: RefObject<WeakMap<TextTrackCue, { s: number; e: number }>>,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const trackIndex = currentSubtitleTrack;
    const sel = trackIndex !== -1 ? injectedSubtitles[trackIndex] : null;
    if (!sel || !sel.src || sel.src.startsWith("blob:")) return;

    const isAss = sel.codec === "ass" || sel.codec === "ssa";
    const gen = subtitleGen.current;
    const W = SUBTITLE_WINDOW_SEC;
    let cancelled = false;

    const requested = new Set<number>();
    const fedVtt = new Set<number>();
    const vttKeys = new Set<string>();
    const windowText = new Map<number, string>();
    let assBucket = -1;
    let firstReady = false;

    const tt = !isAss ? video.textTracks[trackIndex] : null;
    if (tt?.cues) {
      Array.from(tt.cues).forEach((c) => {
        try {
          tt.removeCue(c as TextTrackCue);
        } catch {
          /* noop */
        }
      });
    }

    const parseTs = (s: string): number => {
      const m = s.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
      if (!m) return NaN;
      return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
    };

    const addVttCues = (text: string) => {
      if (!tt) return;
      const lines = text.replace(/\r/g, "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf("-->") === -1) continue;
        const [a, b] = lines[i].split("-->");
        const start = parseTs(a);
        const end = parseTs((b || "").trim().split(/\s+/)[0] || "");
        i++;
        const body: string[] = [];
        while (i < lines.length && lines[i].trim() !== "") {
          body.push(lines[i]);
          i++;
        }
        if (!isFinite(start) || !isFinite(end) || end <= start) continue;
        const textBody = body.join("\n");
        const key = `${start.toFixed(3)}-${end.toFixed(3)}-${textBody}`;
        if (vttKeys.has(key)) continue;
        vttKeys.add(key);
        try {
          const cue = new VTTCue(start, end, textBody);
          cueOriginalTimes.current.set(cue, { s: start, e: end });
          tt.addCue(cue);
        } catch {
          /* noop */
        }
      }
    };

    const applyAss = () => {
      if (!isAss || cancelled) return;
      const cur = Math.floor(video.currentTime / W) * W;
      if (cur === assBucket) return;
      const doc = windowText.get(cur);
      if (doc == null) return;
      const oct = octopusRef.current;
      if (!oct) return;
      assBucket = cur;
      try {
        oct.freeTrack();
      } catch {
        /* noop */
      }
      try {
        oct.setTrack(doc);
        oct.setCurrentTime(video.currentTime + seekOffsetRef.current);
      } catch {
        /* noop */
      }
    };

    const fetchBucket = (bucket: number) => {
      if (bucket < 0 || requested.has(bucket)) return;
      requested.add(bucket);
      const p = fetchSubtitleWindow(sel, bucket);
      if (!p) {
        requested.delete(bucket);
        return;
      }
      p.then((text) => {
        if (cancelled) return;
        windowText.set(bucket, text);
        if (!isAss && !fedVtt.has(bucket)) {
          fedVtt.add(bucket);
          addVttCues(text);
        }
        if (!firstReady) {
          firstReady = true;
          markSubtitle(sel.id, "ready", gen);
        }
        applyAss();
      }).catch(() => {
        requested.delete(bucket);
      });
    };

    const tick = () => {
      if (cancelled) return;
      const time = video.currentTime;
      const cur = Math.floor(time / W) * W;
      fetchBucket(cur);
      if (time - cur > W - 20) fetchBucket(cur + W);
      applyAss();
    };

    tick();
    const iv = window.setInterval(tick, 1000);
    const onSeeked = () => tick();
    video.addEventListener("seeked", onSeeked);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [
    currentSubtitleTrack,
    injectedSubtitles,
    fetchSubtitleWindow,
    markSubtitle,
    octopusRef,
    seekOffsetRef,
    videoRef,
    cueOriginalTimes,
    subtitleGen,
  ]);
}
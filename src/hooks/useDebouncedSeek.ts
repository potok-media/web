import { useCallback, useEffect, useRef, type RefObject } from "react";
import { clampPlaybackTime } from "../utils/playerTimeline";

const SEEK_DEBOUNCE_MS = 300;

interface UseDebouncedSeekParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Live <video> node as state — the retry-listener effect must re-attach when a portal swap
   *  recreates the node. Falls back to videoRef.current when not provided. */
  videoNode?: HTMLVideoElement | null;
  displayDuration: number;
  seekOffsetRef: RefObject<number>;
  setSeekPreview: (value: number | null) => void;
}

export function useDebouncedSeek({
  videoRef,
  videoNode,
  displayDuration,
  seekOffsetRef,
  setSeekPreview,
}: UseDebouncedSeekParams) {
  const pendingSeekRef = useRef<number | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitSeek = useCallback(() => {
    seekTimerRef.current = null;
    const target = pendingSeekRef.current;
    const video = videoRef.current;
    if (target == null || !video) return;

    // Assigning currentTime before MediaSource has metadata updates the DOM value, but hls.js still starts
    // loading fragment 0. The player then waits forever at an unbuffered position (the guest black-screen bug).
    // Keep the logical seek pending and re-apply it once the real media timeline exists.
    if (video.readyState === HTMLMediaElement.HAVE_NOTHING) return;

    const relativeTarget = target - seekOffsetRef.current;
    pendingSeekRef.current = null;
    if (Math.abs(video.currentTime - relativeTarget) > 0.25) {
      video.currentTime = relativeTarget;
    } else {
      setSeekPreview(null);
    }
  }, [seekOffsetRef, setSeekPreview, videoRef]);

  useEffect(() => {
    const video = videoNode !== undefined ? videoNode : videoRef.current;
    if (!video) return;
    const retryPendingSeek = () => commitSeek();
    video.addEventListener("loadedmetadata", retryPendingSeek);
    video.addEventListener("durationchange", retryPendingSeek);
    return () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      video.removeEventListener("loadedmetadata", retryPendingSeek);
      video.removeEventListener("durationchange", retryPendingSeek);
    };
  }, [commitSeek, videoNode, videoRef]);

  const scheduleSeek = useCallback(
    (rawTarget: number) => {
      const clamped = clampPlaybackTime(rawTarget, displayDuration);
      pendingSeekRef.current = clamped;
      setSeekPreview(clamped);
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
      seekTimerRef.current = setTimeout(commitSeek, SEEK_DEBOUNCE_MS);
    },
    [commitSeek, displayDuration, setSeekPreview],
  );

  const handleSeek = useCallback((time: number) => scheduleSeek(time), [scheduleSeek]);

  const handleSeekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      // Stack rapid skips onto the pending target (not currentTime) so only the
      // last burst is committed after the debounce window.
      const base =
        pendingSeekRef.current != null
          ? pendingSeekRef.current
          : seekOffsetRef.current + (video?.currentTime ?? 0);
      scheduleSeek(base + delta);
    },
    [scheduleSeek, seekOffsetRef, videoRef],
  );

  return { handleSeek, handleSeekBy };
}

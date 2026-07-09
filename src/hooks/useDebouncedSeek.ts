import { useCallback, useEffect, useRef, type RefObject } from "react";

const SEEK_DEBOUNCE_MS = 300;

interface UseDebouncedSeekParams {
  videoRef: RefObject<HTMLVideoElement | null>;
  displayDuration: number;
  seekOffsetRef: RefObject<number>;
  setSeekPreview: (value: number | null) => void;
}

export function useDebouncedSeek({
  videoRef,
  displayDuration,
  seekOffsetRef,
  setSeekPreview,
}: UseDebouncedSeekParams) {
  const pendingSeekRef = useRef<number | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    },
    [],
  );

  const commitSeek = useCallback(() => {
    seekTimerRef.current = null;
    const target = pendingSeekRef.current;
    pendingSeekRef.current = null;
    const video = videoRef.current;
    if (target == null || !video) return;

    const relativeTarget = target - seekOffsetRef.current;
    if (Math.abs(video.currentTime - relativeTarget) > 0.25) {
      video.currentTime = relativeTarget;
    } else {
      setSeekPreview(null);
    }
  }, [seekOffsetRef, setSeekPreview, videoRef]);

  const scheduleSeek = useCallback(
    (rawTarget: number) => {
      const clamped = Math.max(
        0,
        Math.min(rawTarget, displayDuration > 0 ? displayDuration : rawTarget),
      );
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